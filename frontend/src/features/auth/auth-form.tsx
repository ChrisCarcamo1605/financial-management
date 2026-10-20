import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/shared/form';
import { errorText } from '@/data/mutations';
import { useDataSource } from '@/data/provider';
import type { Credentials } from '@/data/types';
import { usePreferences } from '@/features/preferences/preferences-provider';
import { useAuth } from './auth-provider';
import { AuthLayout } from './auth-layout';

interface AuthFormProps {
  mode: 'login' | 'register';
}

const SWITCH_TO = { login: '/registro', register: '/login' } as const;

export function AuthForm({ mode }: AuthFormProps) {
  const auth = useAuth();
  const source = useDataSource();
  const { t: dictionary, preferences } = usePreferences();
  const t = dictionary.shell.auth;
  const copy = t[mode];
  const schema = useMemo(() => z.object({
    email: z.email(t.emailInvalid),
    password: z.string().min(6, t.passwordShort),
  }), [t]);
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Credentials>({
    resolver: zodResolver(schema),
  });

  const onSubmit = handleSubmit(async (credentials) => {
    setServerError(null);
    try {
      if (mode === 'login') {
        await auth.login(credentials);
      } else {
        await auth.register(credentials);
        // La cuenta nueva conserva el idioma elegido en la pantalla de registro.
        await source.preferences.update({ language: preferences.language }).catch(() => undefined);
      }
    } catch (error) {
      setServerError(errorText(error, dictionary, t.fallbackError));
    }
  });

  return (
    <AuthLayout title={copy.title} description={copy.description}>
      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        <Field label={t.email} error={errors.email?.message}>
          {(id) => <Input id={id} type="email" autoComplete="email" placeholder={t.emailPlaceholder} aria-invalid={!!errors.email || undefined} {...register('email')} />}
        </Field>
        <Field label={t.password} error={errors.password?.message}>
          {(id) => (
            <Input
              id={id}
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              aria-invalid={!!errors.password || undefined}
              {...register('password')}
            />
          )}
        </Field>
        {serverError && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{serverError}</p>}
        <Button type="submit" size="lg" className="mt-2 w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          {copy.submit}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          {copy.switchText}{' '}
          <Link to={SWITCH_TO[mode]} className="font-medium text-primary underline-offset-4 hover:underline">{copy.switchLink}</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export function LoginPage() {
  return <AuthForm mode="login" />;
}

export function RegisterPage() {
  return <AuthForm mode="register" />;
}
