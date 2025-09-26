'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { dictionary } = useI18n();

  const schema = useMemo(
    () =>
      z.object({
        username: z.string().min(3, dictionary.login.validation.username),
        password: z.string().min(3, dictionary.login.validation.password),
      }),
    [dictionary.login.validation.password, dictionary.login.validation.username],
  );

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = async (values: z.infer<typeof schema>) => {
    setError(null);
    setIsSubmitting(true);
    try {
      await login(values.username, values.password);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(dictionary.login.fallbackError);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/overview');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <Card className="w-[360px] shadow-lg">
          <CardHeader>
            <div className="flex flex-col items-center gap-4">
              <Image src="/logo.svg" alt={dictionary.login.title} width={72} height={72} />
              <div className="text-center">
                <CardTitle className="text-2xl">{dictionary.login.title}</CardTitle>
                <CardDescription>{dictionary.login.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <Form {...form}>
              <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{dictionary.login.username}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={dictionary.login.usernamePlaceholder}
                          autoComplete="username"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{dictionary.login.password}</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder={dictionary.login.passwordPlaceholder}
                          autoComplete="current-password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {error ? (
                  <p className="text-sm text-destructive">{error}</p>
                ) : null}
                <Button className="w-full" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? dictionary.login.submitting : dictionary.login.submit}
                </Button>
              </form>
            </Form>
            <p className="text-center text-xs text-muted-foreground">
              {dictionary.login.help}
            </p>
            <p className="text-center text-xs text-muted-foreground">
              <Link className="underline" href="https://wiki.agentvoiceresponse.com" target="_blank" rel="noreferrer">
                {dictionary.login.docs}
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
