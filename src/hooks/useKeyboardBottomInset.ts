import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, Platform, type KeyboardEvent } from 'react-native';

function readKeyboardInset(event: KeyboardEvent): number {
  const windowHeight = Dimensions.get('window').height;
  const { screenY, height } = event.endCoordinates;

  if (Number.isFinite(screenY) && screenY > 0 && screenY < windowHeight) {
    return Math.max(0, windowHeight - screenY);
  }

  return Math.max(0, height);
}

/** Altura do teclado — útil em Modals onde KeyboardAvoidingView falha no Android. */
export function useKeyboardBottomInset(enabled = true) {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setInset(0);
      return;
    }

    const showEvents =
      Platform.OS === 'ios'
        ? (['keyboardWillShow', 'keyboardWillChangeFrame'] as const)
        : (['keyboardDidShow', 'keyboardDidChangeFrame'] as const);
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubs = showEvents.map((eventName) =>
      Keyboard.addListener(eventName, (event) => {
        setInset(readKeyboardInset(event));
      }),
    );
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setInset(0);
    });

    return () => {
      showSubs.forEach((sub) => sub.remove());
      hideSub.remove();
    };
  }, [enabled]);

  return inset;
}
