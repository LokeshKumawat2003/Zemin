import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

type Props = {
  onDone: () => void;
  color: string;
};

export const FloatingHeart = ({ onDone, color }: Props) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const driftX = (Math.random() - 0.5) * 60;
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -260,
        duration: 2600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: driftX,
        duration: 2600,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(scale, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(1600),
        Animated.timing(opacity, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ]),
    ]).start(({ finished }) => finished && onDone());
  }, [onDone, opacity, scale, translateX, translateY]);

  return (
    <Animated.Text
      style={[
        styles.floatingHeart,
        {
          color,
          opacity,
          transform: [{ translateY }, { translateX }, { scale }],
        },
      ]}
    >
      ❤️
    </Animated.Text>
  );
};

const styles = StyleSheet.create({
  floatingHeart: {
    position: 'absolute',
    bottom: 0,
    fontSize: 24,
  },
});
