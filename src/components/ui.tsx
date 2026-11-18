import { Ionicons } from '@expo/vector-icons';
import { Link, type Href } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors } from '@/lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** título de seção com contador e um link opcional à direita */
export function SectionHeading({
  title,
  count,
  href,
  linkLabel = 'Ver tudo',
  right,
}: {
  title: string;
  count?: number;
  href?: Href;
  linkLabel?: string;
  right?: ReactNode;
}) {
  return (
    <View className="mb-4 flex-row items-baseline justify-between gap-4 border-b border-foreground/10 pb-2.5">
      <Text className="text-[11px] font-semibold uppercase tracking-[2px] text-brand-slate">
        {title}
        {count !== undefined && <Text className="text-brand-slate/60">{`  ${count.toLocaleString('pt-BR')}`}</Text>}
      </Text>
      {right ??
        (href && (
          <Link href={href} asChild>
            <Pressable hitSlop={10}>
              <Text className="text-sm text-brand-slate">{linkLabel}</Text>
            </Pressable>
          </Link>
        ))}
    </View>
  );
}

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  size?: 'md' | 'sm';
  className?: string;
}

const VARIANTS = {
  primary: { box: 'bg-brand-btn', text: 'text-brand-btn-text', icon: colors.btnText },
  secondary: { box: 'bg-surface-strong', text: 'text-foreground', icon: colors.foreground },
  ghost: { box: 'bg-transparent', text: 'text-brand-slate', icon: colors.slate },
  danger: { box: 'bg-brand-crimson/10', text: 'text-brand-crimson', icon: colors.crimson },
} as const;

export function Button({ label, onPress, variant = 'primary', icon, loading, disabled, size = 'md', className = '' }: ButtonProps) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={`flex-row items-center justify-center gap-2 rounded-full active:opacity-80 ${size === 'md' ? 'px-6 py-3.5' : 'px-4 py-2'} ${v.box} ${disabled ? 'opacity-50' : ''} ${className}`}>
      {loading ? (
        <ActivityIndicator size="small" color={v.icon} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={size === 'md' ? 18 : 15} color={v.icon} />}
          <Text className={`font-semibold ${size === 'md' ? 'text-base' : 'text-sm'} ${v.text}`}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Loading({ hint }: { hint?: boolean }) {
  return (
    <View className="flex-1 items-center justify-center gap-4 py-24">
      <ActivityIndicator color={colors.slate} />
      {hint && (
        <Text className="px-10 text-center text-sm text-brand-slate/60">
          O servidor pode levar alguns segundos para acordar.
        </Text>
      )}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View className="flex-1 items-center justify-center gap-4 px-8 py-24">
      <Ionicons name="cloud-offline-outline" size={32} color={colors.slate} />
      <Text className="text-center text-brand-slate">{message ?? 'Não foi possível carregar.'}</Text>
      {onRetry && <Button label="Tentar de novo" variant="secondary" size="sm" onPress={onRetry} />}
    </View>
  );
}

export function EmptyText({ children }: { children: ReactNode }) {
  return <Text className="py-2 text-[15px] leading-6 text-brand-slate">{children}</Text>;
}

export function Field({
  label,
  error,
  right,
  ...props
}: TextInputProps & { label: string; error?: string; right?: ReactNode }) {
  return (
    <View className="gap-1.5">
      <Text className="text-xs uppercase tracking-[1.5px] text-brand-slate/70">{label}</Text>
      <View
        className={`flex-row items-center rounded-xl border bg-surface ${error ? 'border-brand-crimson/60' : 'border-foreground/10'}`}>
        <TextInput
          placeholderTextColor="rgba(154,158,165,0.5)"
          selectionColor={colors.orange}
          className="flex-1 px-4 py-3.5 text-base text-foreground"
          {...props}
        />
        {right}
      </View>
      {error && <Text className="text-sm text-brand-crimson">{error}</Text>}
    </View>
  );
}

/** linha tocável de menu/lista de ações */
export function ActionRow({
  icon,
  label,
  onPress,
  active,
  activeColor = colors.orange,
  disabled,
  trailing,
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
  active?: boolean;
  activeColor?: string;
  disabled?: boolean;
  trailing?: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      className={`flex-row items-center gap-3.5 px-4 py-3.5 active:bg-surface-strong ${disabled ? 'opacity-50' : ''}`}>
      <Ionicons name={icon} size={20} color={active ? activeColor : colors.slate} />
      <Text className="flex-1 text-[15px]" style={{ color: active ? activeColor : colors.foreground }}>
        {label}
      </Text>
      {trailing}
    </Pressable>
  );
}

/** abas simples em pílulas (perfil, busca) */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View className="flex-row gap-2">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            className={`rounded-full px-4 py-2 ${selected ? 'bg-foreground' : 'bg-surface'}`}>
            <Text className={`text-sm font-medium ${selected ? 'text-background' : 'text-brand-slate'}`}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
