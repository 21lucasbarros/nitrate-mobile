import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { Button, ErrorState, Field, Loading, SectionHeading } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { confirmAction, showError } from '@/lib/dialogs';
import { useAuthStore } from '@/lib/auth-store';
import { API_BASE_URL, WEB_URL } from '@/lib/config';
import { openLegalPage, TMDB_NOTICE } from '@/lib/legal';
import { meKey, useDebouncedValue, useMe } from '@/lib/hooks';
import { usernameSchema } from '@/lib/schemas';
import { changeMyPassword, checkUsernameAvailability, updateMyProfile } from '@/lib/services';
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
        <ProfileForm key={`${me.data.name}|${me.data.username}|${me.data.bio}|${me.data.twitter}|${me.data.instagram}`} user={me.data} />

        <PasswordForm />

        <View className="mt-12">
          <SectionHeading title="Conta" />
          <Text className="mb-4 text-sm text-brand-slate">
            Conectado como <Text className="font-semibold text-foreground">@{me.data.username}</Text>. Para exportar seus dados ou
            excluir a conta, use o Nitrate na web.
          </Text>
          <Button label="Sair" variant="danger" icon="log-out-outline" onPress={confirmSignOut} />
        </View>

        <View className="mt-12">
          <SectionHeading title="Sobre" />
          {WEB_URL && (
            <View className="mb-6 flex-row gap-3">
              <Button label="Termos de Uso" variant="secondary" size="sm" onPress={() => openLegalPage('termos')} />
              <Button label="Privacidade" variant="secondary" size="sm" onPress={() => openLegalPage('privacidade')} />
            </View>
          )}
          {/* atribuição exigida pelos termos da API do TMDB */}
          <Pressable onPress={() => WebBrowser.openBrowserAsync('https://www.themoviedb.org')} accessibilityRole="link" accessibilityLabel="The Movie Database (TMDB)" className="self-start">
            <Image source={require('../../assets/images/tmdb-logo.svg')} style={{ width: 120, height: 16 }} contentFit="contain" />
          </Pressable>
          <Text className="mt-2 text-xs text-brand-slate/70">{TMDB_NOTICE}</Text>
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
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio ?? '');
  const [twitter, setTwitter] = useState(user.twitter ?? '');
  const [instagram, setInstagram] = useState(user.instagram ?? '');
  const [saved, setSaved] = useState(false);

  const usernameChanged = username !== user.username;
  // o próprio @ (mesmo com outras maiúsculas) não é consultado: para a API ele está "em uso" por você
  const sameAsMine = (value: string) => value.toLowerCase() === user.username.toLowerCase();
  const usernameError = usernameChanged ? usernameSchema.safeParse(username).error?.issues[0]?.message : undefined;
  const debouncedUsername = useDebouncedValue(username, 400);
  const availability = useQuery({
    queryKey: ['username-available', debouncedUsername],
    queryFn: () => checkUsernameAvailability(debouncedUsername),
    enabled: !sameAsMine(debouncedUsername) && usernameSchema.safeParse(debouncedUsername).success,
    staleTime: 30_000,
  });
  const taken = !sameAsMine(username) && debouncedUsername === username && availability.data?.available === false;

  const save = useMutation({
    mutationFn: () =>
      updateMyProfile({ name: name.trim(), username, bio: bio.trim(), twitter: twitter.trim(), instagram: instagram.trim() }),
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
        <View className="gap-1.5">
          <Field
            label="Usuário"
            value={username}
            onChangeText={(v) => edit(setUsername)(v.replace(/^@/, ''))}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            maxLength={20}
            error={usernameError ?? (taken ? 'Esse usuário já existe.' : undefined)}
          />
          {usernameChanged && !usernameError && !taken && (
            <Text className="text-xs text-brand-slate/70">
              Seu perfil passa a ser @{username}. Links antigos para o @ anterior deixam de funcionar.
            </Text>
          )}
        </View>
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
          disabled={name.trim().length < 2 || !!usernameError || taken}
        />
      </View>
    </View>
  );
}

/** troca a senha sabendo a atual; as outras sessões caem e este aparelho recebe um token novo */
function PasswordForm() {
  const signIn = useAuthStore((s) => s.signIn);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [done, setDone] = useState(false);

  const tooShort = next.length > 0 && next.length < 8; // igual ao AuthService
  const mismatch = confirmation.length > 0 && next !== confirmation;

  const change = useMutation({
    mutationFn: () => changeMyPassword(current, next),
    onSuccess: async (response) => {
      await signIn(response.token);
      setCurrent('');
      setNext('');
      setConfirmation('');
      setDone(true);
    },
    onError: (err) => showError('Não foi possível trocar a senha', errorMessage(err)),
  });

  const edit = (setter: (v: string) => void) => (value: string) => {
    setDone(false);
    setter(value);
  };

  return (
    <View className="mt-12">
      <SectionHeading title="Senha" />
      <View className="gap-5">
        <Field label="Senha atual" value={current} onChangeText={edit(setCurrent)} secureTextEntry autoCapitalize="none" autoComplete="current-password" textContentType="password" />
        <Field
          label="Nova senha"
          value={next}
          onChangeText={edit(setNext)}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          error={tooShort ? 'Use pelo menos 8 caracteres.' : undefined}
        />
        <Field
          label="Confirme a nova senha"
          value={confirmation}
          onChangeText={edit(setConfirmation)}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          error={mismatch ? 'As senhas não coincidem.' : undefined}
        />
        <Text className="text-xs text-brand-slate/70">
          Você continua conectado neste aparelho, mas as sessões nos outros são encerradas.
        </Text>
        <Button
          label={done ? 'Senha alterada' : 'Trocar senha'}
          icon={done ? 'checkmark' : undefined}
          onPress={() => change.mutate()}
          loading={change.isPending}
          disabled={!current || !next || !confirmation || tooShort || mismatch}
        />
      </View>
    </View>
  );
}
