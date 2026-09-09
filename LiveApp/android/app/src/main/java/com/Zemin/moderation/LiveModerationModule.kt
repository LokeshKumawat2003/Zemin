package com.Zemin.moderation

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

class LiveModerationModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "LiveModeration"

  @ReactMethod
  fun getLatestFramePath(promise: Promise) {
    try {
      val path = ModerationFrameStore.getLatestFramePath()
      if (path != null && File(path).exists()) {
        promise.resolve(path)
      } else {
        promise.resolve(null)
      }
    } catch (error: Exception) {
      promise.reject("MODERATION_FRAME_ERROR", error.message, error)
    }
  }

  @ReactMethod
  fun isSupported(promise: Promise) {
    promise.resolve(true)
  }
}
