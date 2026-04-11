import {useEffect, useState} from 'react';
import {version as currentVersion} from '../../package.json';

const CONFIG_URL =
  'https://raw.githubusercontent.com/zorand1986/plantly-ai/master/config/force-update.json';

export type ForceUpdateConfig = {
  min_required_version: string;
  update_message: string;
  store_url_ios: string;
  store_url_android: string;
};

type Status =
  | {state: 'loading'}
  | {state: 'update_required'; config: ForceUpdateConfig}
  | {state: 'no_internet'}
  | {state: 'ok'};

function isVersionBelow(current: string, minimum: string): boolean {
  const parse = (v: string) => v.split('.').map(Number);
  const [cMaj, cMin, cPatch] = parse(current);
  const [mMaj, mMin, mPatch] = parse(minimum);
  if (cMaj !== mMaj) {return cMaj < mMaj;}
  if (cMin !== mMin) {return cMin < mMin;}
  return cPatch < mPatch;
}

export function useForceUpdate(): {status: Status; retry: () => void} {
  const [status, setStatus] = useState<Status>({state: 'loading'});
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setStatus({state: 'loading'});

    fetch(`${CONFIG_URL}?_=${Date.now()}`, {cache: 'no-store'})
      .then(r => r.json())
      .then((config: ForceUpdateConfig) => {
        if (cancelled) {return;}
        if (isVersionBelow(currentVersion, config.min_required_version)) {
          setStatus({state: 'update_required', config});
        } else {
          setStatus({state: 'ok'});
        }
      })
      .catch(() => {
        if (!cancelled) {setStatus({state: 'no_internet'});}
      });

    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  return {status, retry: () => setRetryCount(c => c + 1)};
}
