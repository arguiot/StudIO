//
//  AudioPlayer.swift
//  StudIO
//
//  Created by Arthur Guiot on 17/09/2019.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import Foundation
import AVFoundation

struct audioPlayer {
    
    static var backgroundSoundIsMuted = false
    static var effectSoundIsMuted = false
    static var firstPlay = true
    static var backgroundPlayer = AVAudioPlayer()
    static var soundEffectPlayer = AVAudioPlayer()
    
    static func playBackgroundSound() {
        if backgroundSoundIsMuted == false && firstPlay == true {
            let AssortedMusics = NSURL(fileURLWithPath: Bundle.main.path(forResource: "The_Tesseract", ofType: "mp3")!)
            guard let avaudio = try? AVAudioPlayer(contentsOf: AssortedMusics as URL) else { return }
            audioPlayer.backgroundPlayer = avaudio
            audioPlayer.backgroundPlayer.prepareToPlay()
            audioPlayer.backgroundPlayer.numberOfLoops = -1
            audioPlayer.backgroundPlayer.play()
        }
    }
    
   static func playImpactSound(sound: String) {
        if effectSoundIsMuted == false  {
            let AssortedMusics = NSURL(fileURLWithPath: Bundle.main.path(forResource: sound, ofType: "mp3")!)
            guard let avaudio = try? AVAudioPlayer(contentsOf: AssortedMusics as URL) else { return }
            audioPlayer.backgroundPlayer = avaudio
            audioPlayer.soundEffectPlayer.prepareToPlay()
            audioPlayer.soundEffectPlayer.numberOfLoops = 0
            audioPlayer.soundEffectPlayer.play()
        }
    }
    
    static func playBtnTappedSound() {
        if audioPlayer.effectSoundIsMuted == false  {
            audioPlayer.playImpactSound(sound: "btnTapped")
        }
    }
    
    static func muteBackgroundSound() {
        if audioPlayer.backgroundPlayer.isPlaying {
            audioPlayer.backgroundPlayer.pause()
        }
    }
    
    static func unmuteBackgroundSound() {
        audioPlayer.backgroundPlayer.play()
    }
}
