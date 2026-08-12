import { colors } from '@/theme';
import React, { PropsWithChildren } from 'react'
import { SafeAreaView, ScrollView, StyleSheet, ViewStyle } from 'react-native'

type Props = PropsWithChildren<{
  scroll?: boolean,
  style?: ViewStyle,
}>

const Screen = ({scroll= false, style, children} : Props) => {
  if(scroll) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={[styles.scrollContent, style]} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </SafeAreaView>
    )
  }
  return (
    <div>Screen</div>
  )
};

const styles  = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  }
})
export default Screen;

