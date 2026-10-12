import { Image } from 'expo-image';
import { Button, Input, InputOTP } from 'heroui-native';
import { useEffect, useState } from 'react';
import {
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { ApiError } from '@/lib/api-client.ts';
import { useRequestOtp, useVerifyOtp } from '../hooks/use-otp-sign-in.ts';

const OTP_LENGTH = 6;

/** Centred while there is room; anchored to the top once the keypad takes it. */
function useIsKeyboardOpen(): boolean {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', () => {
      setIsOpen(true);
    });
    const hidden = Keyboard.addListener('keyboardDidHide', () => {
      setIsOpen(false);
    });
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  return isOpen;
}

export function SignInScreen() {
  const [digits, setDigits] = useState('');
  const [code, setCode] = useState('');
  const isKeyboardOpen = useIsKeyboardOpen();
  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();

  const challengeId = requestOtp.data?.challengeId ?? null;

  const startOver = () => {
    setCode('');
    verifyOtp.reset();
    requestOtp.reset();
  };

  useEffect(() => {
    if (challengeId === null) return;

    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      startOver();
      return true;
    });
    return () => {
      back.remove();
    };
  });
  const failure = requestOtp.error ?? verifyOtp.error;
  const message = failure instanceof ApiError ? failure.message : null;
  const mobile = `+91${digits}`;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      {...(Platform.OS === 'ios' ? { behavior: 'padding' as const } : {})}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName={`grow gap-8 px-6 pt-10 pb-12 ${
          isKeyboardOpen ? 'justify-start' : 'justify-center'
        }`}
        keyboardShouldPersistTaps="handled"
      >
        <View className="gap-3">
          <Image
            source={require('../../../../assets/logo-wordmark.png')}
            style={{ width: 220, height: 57 }}
            contentFit="contain"
            accessibilityLabel="CoFarm"
          />
          <Text className="text-4xl font-extrabold leading-tight text-foreground">
            Your farm,{'\n'}in your pocket.
          </Text>
          <Text className="mt-1 text-base text-muted">
            {challengeId === null
              ? 'Sign in with the mobile number mapped to your project code.'
              : `Enter the ${OTP_LENGTH}-digit code sent to ${mobile}.`}
          </Text>
        </View>

        <View className="gap-4">
          {challengeId === null ? (
            <View className="gap-2">
              <Text className="text-xs font-bold tracking-wider text-muted uppercase">
                Mobile number
              </Text>
              <Input
                value={digits}
                onChangeText={setDigits}
                keyboardType="number-pad"
                maxLength={10}
                placeholder="98450 22114"
                autoComplete="tel"
              />
            </View>
          ) : (
            <InputOTP maxLength={OTP_LENGTH} value={code} onChange={setCode}>
              <InputOTP.Group className="justify-center">
                {Array.from({ length: OTP_LENGTH }, (_, index) => (
                  <InputOTP.Slot key={index} index={index} />
                ))}
              </InputOTP.Group>
            </InputOTP>
          )}

          {challengeId === null ? null : (
            <Pressable
              className="self-center"
              accessibilityRole="button"
              accessibilityLabel="Change mobile number"
              onPress={startOver}
            >
              <Text className="text-sm font-bold text-clay-700">Change number</Text>
            </Pressable>
          )}

          {message === null ? null : (
            <Text className="text-sm text-danger" accessibilityRole="alert">
              {message}
            </Text>
          )}

          {challengeId === null ? (
            <Button
              isDisabled={digits.length !== 10 || requestOtp.isPending}
              onPress={() => {
                requestOtp.mutate(mobile);
              }}
            >
              {requestOtp.isPending ? 'Sending…' : 'Send code'}
            </Button>
          ) : (
            <Button
              isDisabled={code.length !== OTP_LENGTH || verifyOtp.isPending}
              onPress={() => {
                verifyOtp.mutate({ challengeId, code });
              }}
            >
              {verifyOtp.isPending ? 'Checking…' : 'Verify and continue'}
            </Button>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
