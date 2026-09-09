package com.Zemin

import android.app.Application
import com.Zemin.moderation.LiveModerationPackage
import com.Zemin.moderation.ModerationFrameProcessorFactory
import com.Zemin.moderation.ModerationFrameStore
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.oney.WebRTCModule.videoEffects.ProcessorProvider

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          add(LiveModerationPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    ModerationFrameStore.init(this)
    ProcessorProvider.addProcessor("zemin-moderation", ModerationFrameProcessorFactory())
    loadReactNative(this)
  }
}
