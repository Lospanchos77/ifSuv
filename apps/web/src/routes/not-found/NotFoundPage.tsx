import { Stack, Text, Title } from '@mantine/core';

export function NotFoundPage(): JSX.Element {
  return (
    <Stack>
      <Title order={2}>404</Title>
      <Text c="dimmed">Cette page n&apos;existe pas.</Text>
    </Stack>
  );
}
