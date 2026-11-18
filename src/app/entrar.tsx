import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Controller, useForm, useWatch, type Control, type FieldValues, type Path } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View, type TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Field } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useDebouncedValue } from '@/lib/hooks';
import { loginSchema, registerSchema, usernameSchema, type LoginFormData, type RegisterFormData } from '@/lib/schemas';
import { checkUsernameAvailability, login, register } from '@/lib/services';
import { colors } from '@/lib/theme';

type Mode = 'login' | 'register';

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('login');

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-background">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32, paddingHorizontal: 24 }}>
        <View className="flex-row items-center gap-1">
          <Text className="text-3xl font-bold uppercase tracking-tighter text-foreground">Nitrate</Text>
          <View className="mt-2 h-2 w-2 rounded-full bg-brand-orange" />
        </View>
        <Text className="mt-3 font-serif-italic text-xl text-brand-slate">O seu diário de cinema.</Text>

        <View className="mt-10 flex-row rounded-full bg-surface p-1">
          {(['login', 'register'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === m }}
              className={`flex-1 items-center rounded-full py-2.5 ${mode === m ? 'bg-surface-strong' : ''}`}>
              <Text className={`text-sm font-semibold ${mode === m ? 'text-foreground' : 'text-brand-slate'}`}>
                {m === 'login' ? 'Entrar' : 'Criar conta'}
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="mt-8">{mode === 'login' ? <LoginForm /> : <RegisterForm />}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function LoginForm() {
  const signIn = useAuthStore((s) => s.signIn);
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { login: '', password: '' },
  });

  const onSubmit = handleSubmit(async (data) => {
    setError(null);
    try {
      const response = await login({ login: data.login.trim(), password: data.password });
      await signIn(response.token);
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível entrar. Tente novamente.'));
    }
  });

  return (
    <View className="gap-5">
      <FormField
        control={control}
        name="login"
        label="E-mail ou usuário"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        textContentType="username"
        returnKeyType="next"
      />
      <PasswordField control={control} name="password" label="Senha" autoComplete="current-password" onSubmitEditing={() => onSubmit()} />
      {error && <ErrorBox message={error} />}
      <Button label="Entrar" onPress={onSubmit} loading={formState.isSubmitting} className="mt-2" />
    </View>
  );
}

function RegisterForm() {
  const signIn = useAuthStore((s) => s.signIn);
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', username: '', email: '', password: '', confirmPassword: '' },
  });

  const username = useDebouncedValue(useWatch({ control, name: 'username' }), 400);
  const usernameValid = usernameSchema.safeParse(username).success;
  const availability = useQuery({
    queryKey: ['username-available', username],
    queryFn: () => checkUsernameAvailability(username),
    enabled: usernameValid,
    staleTime: 30_000,
  });
  const taken = usernameValid && availability.data?.available === false;

  const onSubmit = handleSubmit(async ({ confirmPassword: _, ...data }) => {
    if (taken) return;
    setError(null);
    try {
      const response = await register({ ...data, name: data.name.trim(), email: data.email.trim() });
      await signIn(response.token);
    } catch (err) {
      setError(errorMessage(err, 'Não foi possível criar a conta. Tente novamente.'));
    }
  });

  return (
    <View className="gap-5">
      <FormField control={control} name="name" label="Nome" autoComplete="name" textContentType="name" />
      <View className="gap-1.5">
        <FormField
          control={control}
          name="username"
          label="Usuário"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username-new"
          textContentType="username"
          placeholder="seu_usuario"
        />
        {usernameValid && availability.data && (
          <Text className={`text-sm ${taken ? 'text-brand-crimson' : 'text-brand-emerald'}`}>
            {taken ? 'Esse usuário já existe.' : 'Disponível!'}
          </Text>
        )}
      </View>
      <FormField
        control={control}
        name="email"
        label="E-mail"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <PasswordField control={control} name="password" label="Senha" autoComplete="new-password" />
      <PasswordField control={control} name="confirmPassword" label="Confirme a senha" autoComplete="new-password" onSubmitEditing={() => onSubmit()} />
      {error && <ErrorBox message={error} />}
      <Button label="Criar conta" onPress={onSubmit} loading={formState.isSubmitting} disabled={taken} className="mt-2" />
    </View>
  );
}

type FormFieldProps<T extends FieldValues> = TextInputProps & { control: Control<T>; name: Path<T>; label: string; right?: ReactNode };

function FormField<T extends FieldValues>({ control, name, label, ...props }: FormFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field
          label={label}
          value={field.value}
          onChangeText={field.onChange}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
          {...props}
        />
      )}
    />
  );
}

/** senha com o botão de olho para mostrar o que foi digitado */
function PasswordField<T extends FieldValues>(props: FormFieldProps<T>) {
  const [visible, setVisible] = useState(false);
  return (
    <FormField
      {...props}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      textContentType="password"
      right={
        <Pressable
          onPress={() => setVisible(!visible)}
          accessibilityLabel={visible ? 'Esconder senha' : 'Mostrar senha'}
          hitSlop={8}
          className="px-4">
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.slate} />
        </Pressable>
      }
    />
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <View className="rounded-xl border border-brand-crimson/30 bg-brand-crimson/10 px-4 py-3">
      <Text className="text-sm text-brand-crimson">{message}</Text>
    </View>
  );
}
