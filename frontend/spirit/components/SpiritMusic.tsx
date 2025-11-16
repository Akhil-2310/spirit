"use client";

import { useEffect, useRef, useState } from "react";

interface SpiritAttributes {
  aggression: number;
  serenity: number;
  chaos: number;
  influence: number;
  connectivity: number;
}

export function SpiritMusic({ attrs }: { attrs: SpiritAttributes }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [Tone, setTone] = useState<any>(null);
  const synthsRef = useRef<any[]>([]);
  const sequenceRef = useRef<any>(null);

  useEffect(() => {
    // Dynamic import to avoid SSR issues
    import("tone").then((module) => {
      setTone(module);
    });

    return () => {
      stopMusic();
    };
  }, []);

  const stopMusic = () => {
    if (sequenceRef.current) {
      sequenceRef.current.stop();
      sequenceRef.current.dispose();
      sequenceRef.current = null;
    }
    synthsRef.current.forEach((synth) => synth.dispose());
    synthsRef.current = [];
  };

  const playMusic = async () => {
    if (!Tone) return;

    if (isPlaying) {
      stopMusic();
      await Tone.Transport.stop();
      setIsPlaying(false);
      return;
    }

    await Tone.start();
    stopMusic(); // Clean up any existing

    // Validate attributes - prevent NaN errors
    const safeAttrs = {
      aggression: Number(attrs.aggression) || 0,
      serenity: Number(attrs.serenity) || 0,
      chaos: Number(attrs.chaos) || 0,
      influence: Number(attrs.influence) || 0,
      connectivity: Number(attrs.connectivity) || 0,
    };

    // Base parameters from spirit attributes
    const tempo = 40 + (safeAttrs.aggression / 100) * 100; // 40-140 BPM
    Tone.Transport.bpm.value = tempo;

    // Scale selection based on serenity
    const scales = {
      peaceful: ["C4", "D4", "E4", "G4", "A4", "C5", "D5", "E5"], // Pentatonic
      balanced: ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"], // Major
      chaotic: ["C4", "Db4", "E4", "F4", "G4", "Ab4", "B4", "C5"], // Harmonic minor
      dark: ["C4", "D4", "Eb4", "F4", "G4", "Ab4", "Bb4", "C5"], // Dorian
    };

    let scale = scales.peaceful;
    if (safeAttrs.aggression > 60) scale = scales.dark;
    else if (safeAttrs.chaos > 50) scale = scales.chaotic;
    else if (safeAttrs.serenity < 40) scale = scales.balanced;

    // Main melody synth
    const melodySynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: safeAttrs.chaos > 50 ? "sawtooth" : safeAttrs.serenity > 60 ? "sine" : "triangle",
      },
      envelope: {
        attack: 0.005 + (safeAttrs.serenity / 100) * 0.5,
        decay: 0.1,
        sustain: 0.3 + (safeAttrs.serenity / 100) * 0.4,
        release: 0.8 + (safeAttrs.serenity / 100) * 2,
      },
    }).toDestination();
    melodySynth.volume.value = -10;
    synthsRef.current.push(melodySynth);

    // Bass synth for influence
    let bassSynth = null;
    if (safeAttrs.influence > 30) {
      bassSynth = new Tone.MonoSynth({
        oscillator: { type: "square" },
        envelope: { attack: 0.1, decay: 0.3, sustain: 0.4, release: 0.8 },
      }).toDestination();
      bassSynth.volume.value = -15;
      synthsRef.current.push(bassSynth);
    }

    // Noise for chaos
    let noiseSynth = null;
    if (safeAttrs.chaos > 40) {
      noiseSynth = new Tone.NoiseSynth({
        noise: { type: "pink" },
        envelope: { attack: 0.001, decay: 0.1, sustain: 0 },
      }).toDestination();
      noiseSynth.volume.value = -25;
      synthsRef.current.push(noiseSynth);
    }

    // Reverb for serenity
    if (safeAttrs.serenity > 50) {
      const reverb = new Tone.Reverb({
        decay: 2 + (safeAttrs.serenity / 100) * 3,
        wet: 0.3,
      }).toDestination();
      melodySynth.connect(reverb);
      synthsRef.current.push(reverb);
    }

    // Delay for connectivity
    if (safeAttrs.connectivity > 40) {
      const delay = new Tone.FeedbackDelay({
        delayTime: "8n",
        feedback: 0.3 + (safeAttrs.connectivity / 100) * 0.3,
        wet: 0.2,
      }).toDestination();
      melodySynth.connect(delay);
      synthsRef.current.push(delay);
    }

    // Generate melodic pattern
    let step = 0;
    const sequence = new Tone.Sequence(
      (time: number, note: string | null) => {
        // Main melody
        if (note) {
          melodySynth.triggerAttackRelease(note, "8n", time);
        }

        // Bass line (influence)
        if (bassSynth && step % 4 === 0) {
          const bassNote = scale[0].replace("4", "2");
          bassSynth.triggerAttackRelease(bassNote, "4n", time);
        }

        // Chaos bursts
        if (noiseSynth && safeAttrs.chaos > 50 && Math.random() < safeAttrs.chaos / 200) {
          noiseSynth.triggerAttackRelease("8n", time);
        }

        step++;
      },
      generateMelodyPattern(scale, attrs),
      "8n"
    );

    sequence.start(0);
    sequenceRef.current = sequence;

    Tone.Transport.start();
    setIsPlaying(true);
  };

  // Generate melody pattern based on attributes
  const generateMelodyPattern = (scale: string[], attrs: SpiritAttributes) => {
    const safeAttrs = {
      aggression: Number(attrs.aggression) || 0,
      serenity: Number(attrs.serenity) || 0,
      chaos: Number(attrs.chaos) || 0,
      influence: Number(attrs.influence) || 0,
      connectivity: Number(attrs.connectivity) || 0,
    };

    const length = safeAttrs.connectivity > 50 ? 16 : 8;
    const pattern: (string | null)[] = [];

    for (let i = 0; i < length; i++) {
      // Note density based on aggression
      const playNote = Math.random() < 0.3 + (safeAttrs.aggression / 100) * 0.5;
      
      if (playNote) {
        // Chaos affects note selection
        const index = safeAttrs.chaos > 50
          ? Math.floor(Math.random() * scale.length)
          : Math.floor((i / length) * scale.length);
        pattern.push(scale[index % scale.length]);
      } else {
        pattern.push(null);
      }
    }

    return pattern;
  };

  return (
    <button
      onClick={playMusic}
      disabled={!Tone}
      className={`px-6 py-3 rounded-xl font-semibold transition-all ${
        isPlaying
          ? "bg-pink-600 hover:bg-pink-700 animate-pulse"
          : "bg-purple-600 hover:bg-purple-700"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {isPlaying ? "🔊 Stop Music" : "🎵 Play Spirit Music"}
    </button>
  );
}

