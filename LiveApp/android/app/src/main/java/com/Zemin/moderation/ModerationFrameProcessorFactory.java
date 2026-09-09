package com.Zemin.moderation;

import com.oney.WebRTCModule.videoEffects.VideoFrameProcessor;
import com.oney.WebRTCModule.videoEffects.VideoFrameProcessorFactoryInterface;

public class ModerationFrameProcessorFactory implements VideoFrameProcessorFactoryInterface {
  @Override
  public VideoFrameProcessor build() {
    return new ModerationFrameProcessor();
  }
}
