import { Redirect, useLocalSearchParams } from 'expo-router';

import { useAuth } from '@/src/context/AuthContext';

function singleParam(val: string | string[] | undefined): string {
  return (Array.isArray(val) ? val[0] : val) ?? '';
}

export default function StorageLocationDeepLinkRoute() {
  const { ready, session, household } = useAuth();
  const params = useLocalSearchParams<{
    v?: string | string[];
    h?: string | string[];
    l?: string | string[];
  }>();

  if (!ready) return null;

  if (!session || !household) {
    return <Redirect href="/" />;
  }

  return (
    <Redirect
      href={{
        pathname: '/(app)/household/storage-location',
        params: {
          v: singleParam(params.v),
          h: singleParam(params.h),
          l: singleParam(params.l),
        },
      } as any}
    />
  );
}
