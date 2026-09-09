package com.Zemin.moderation;

import android.content.Context;
import java.io.File;

public final class ModerationFrameStore {
  private static volatile String latestFramePath;
  private static volatile long latestFrameAt;
  private static volatile File cacheDir;

  private ModerationFrameStore() {}

  public static void init(Context context) {
    cacheDir = new File(context.getCacheDir(), "zemin-live-moderation-native");
    if (!cacheDir.exists()) {
      cacheDir.mkdirs();
    }
  }

  public static File getCacheDir() {
    return cacheDir;
  }

  public static void setLatestFrame(String path) {
    latestFramePath = path;
    latestFrameAt = System.currentTimeMillis();
  }

  public static String getLatestFramePath() {
    return latestFramePath;
  }

  public static long getLatestFrameAt() {
    return latestFrameAt;
  }
}
