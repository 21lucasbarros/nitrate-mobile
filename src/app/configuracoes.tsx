import { useMutation, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';

import { Button, ErrorState, Field, Loading, SectionHeading } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { confirmAction, showError } from '@/lib/dialogs';
import { useAuthStore } from '@/lib/auth-store';
import { API_BASE_URL } from '@/lib/config';
import { meKey, useMe } from '@/lib/hooks';
import { updateMyProfile } from '@/lib/services';
import type { UserProfile } from '@/lib/types';

// iguais aos limites do backend (AccountService)
const NAME_MAX = 60;
const BIO_MAX = 300;

export default function SettingsScreen() {
  const me = useMe();
  const signOut = useAuthStore((s) => s.signOut);

  const confirmSignOut = () =>
    confirmAction('Sair da conta?', undefined, 'Sair', () => signOut());

  if (me.isPending) return <Loading />;
  if (!me.data) return <ErrorState onRetry={() => me.refetch()} />;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-background" keyboardVerticalOffset={90}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
        {/* key: se o perfil recarregar com outros dados, o formulário recomeça deles */}
        <ProfileForm key={`${me.data.name}|${me.data.bio}|${me.data.twitter}|${me.data.instagram}`} user={me.data} />

        <View className="mt-12">
          <SectionHeading title="Conta" />
          <Text className="mb-4 text-sm text-brand-slate">
            Conectado como <Text className="font-semibold text-foreground">@{me.data.username}</Text>. Para exportar seus dados ou
            excluir a conta, use o Nitrate na web.
          </Text>
          <Button label="Sair" variant="danger" icon="log-out-outline" onPress={confirmSignOut} />
        </View>

        <Text className="mt-12 text-center text-xs text-brand-slate/50">
          Nitrate {Constants.expoConfig?.version} · {API_BASE_URL}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ProfileForm({ user }: { user: UserProfile }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio ?? '');
  const [twitter, setTwitter] = useState(user.twitter ?? '');
  const [instagram, setInstagram] = useState(user.instagram ?? '');
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: () => updateMyProfile({ name: name.trim(), bio: bio.trim(), twitter: twitter.trim(), instagram: instagram.trim() }),
    onSuccess: (profile) => {
      queryClient.setQueryData(meKey, profile);
      queryClient.invalidateQueries({ queryKey: ['profile', user.username] });
      setSaved(true);
    },
    onError: (err) => showError('Não foi possível salvar', errorMessage(err)),
  });

  const edit = (setter: (v: string) => void) => (value: string) => {
    setSaved(false);
    setter(value);
  };

  return (
    <View>
      <SectionHeading title="Perfil" />
      <View className="gap-5">
        <Field label="Nome" value={name} onChangeText={edit(setName)} maxLength={NAME_MAX} autoComplete="name" />
        <View className="gap-1">
          <Field
            label="Bio"
            value={bio}
            onChangeText={edit(setBio)}
            maxLength={BIO_MAX}
            multiline
            textAlignVertical="top"
            style={{ minHeight: 96 }}
            placeholder="Conte que tipo de filme você gosta"
          />
          <Text className={`self-end text-xs ${bio.length > BIO_MAX - 30 ? 'text-brand-orange' : 'text-brand-slate/60'}`}>
            {bio.length}/{BIO_MAX}
          </Text>
        </View>
        {/* aceita o @ ou o link do perfil: o backend extrai o @ */}
        <Field label="X / Twitter" value={twitter} onChangeText={edit(setTwitter)} autoCapitalize="none" autoCorrect={false} placeholder="@usuario" maxLength={55} />
        <Field label="Instagram" value={instagram} onChangeText={edit(setInstagram)} autoCapitalize="none" autoCorrect={false} placeholder="@usuario" maxLength={70} />
        <Button
          label={saved ? 'Salvo' : 'Salvar perfil'}
          icon={saved ? 'checkmark' : undefined}
          onPress={() => save.mutate()}
          loading={save.isPending}
          disabled={name.trim().length < 2}
        />
      </View>
    </View>
  );
}
