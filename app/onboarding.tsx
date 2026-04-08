/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  Easing,
  Platform,
  UIManager,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Audio } from "expo-av";
import Svg, { Path } from "react-native-svg";
import { setOnboarded, saveProfile } from "../src/storage";
import { useTheme, fonts } from "../src/theme";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PHASES = [
  "name",
  "sage",
  "template_demo",
  "philosophy",
] as const;

type Phase = (typeof PHASES)[number];

const EASE_OUT = Easing.out(Easing.cubic);
const EASE_IN = Easing.in(Easing.cubic);
const EASE_IO = Easing.inOut(Easing.cubic);

// Loopy scribble arrow — swoops left then loops back right before pointing down
// mirrors horizontally when flip=true
function ScribbleArrow({
  color,
  flip,
  opacity,
}: {
  color: string;
  flip?: boolean;
  opacity: Animated.AnimatedInterpolation<number> | Animated.Value;
}) {
  // Arrow path: starts top, curves left with a loop, ends pointing down at bottom-center
  const path = flip
    ? "M62 4 C72 8, 78 18, 70 28 C62 38, 52 32, 56 24 C60 16, 72 20, 74 30 L68 52 L74 48 M68 52 L64 46"
    : "M38 4 C28 8, 22 18, 30 28 C38 38, 48 32, 44 24 C40 16, 28 20, 26 30 L32 52 L26 48 M32 52 L36 46";
  return (
    <Animated.View style={{ opacity, alignItems: "center" }}>
      <Svg width={100} height={56} viewBox="0 0 100 56">
        <Path
          d={path}
          stroke={color}
          strokeWidth={2.2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Animated.View>
  );
}

// Segment: plain text or bold text
type Seg = { text: string; bold?: boolean };

// Splits a flat string + boldWords list into segments for mixed-weight rendering
function makeSegs(text: string, boldWords: string[] = []): Seg[] {
  if (boldWords.length === 0) return [{ text }];
  const pattern = boldWords.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const re = new RegExp(`(${pattern})`, "g");
  return text.split(re).filter(Boolean).map((part) => ({
    text: part,
    bold: boldWords.includes(part),
  }));
}

// Renders text char-by-char with a blinking cursor, playing a sound each tick.
// Calls onDone when the full string is revealed.
function TypewriterText({
  segments,
  active,
  speed = 32,
  style,
  cursorColor,
  soundRef,
  onDone,
}: {
  segments: Seg[];
  active: boolean;
  speed?: number;
  style?: object | object[];
  cursorColor: string;
  soundRef: React.RefObject<Audio.Sound | null>;
  onDone?: () => void;
}) {
  const fullText = segments.map((s) => s.text).join("");
  const [count, setCount] = useState(0);
  const [cursorOn, setCursorOn] = useState(true);
  const doneRef = useRef(false);
  const cursorBlink = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) {
      setCount(0);
      doneRef.current = false;
      return;
    }
    doneRef.current = false;
    setCount(0);
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setCount(i);
      // play sound
      if (soundRef.current && fullText[i - 1] !== " ") {
        soundRef.current.setPositionAsync(0).then(() => {
          soundRef.current?.playAsync();
        });
      }
      if (i >= fullText.length) {
        clearInterval(iv);
        if (!doneRef.current) {
          doneRef.current = true;
          onDone?.();
        }
      }
    }, speed);
    return () => clearInterval(iv);
  }, [active]);

  // Blinking cursor after done
  useEffect(() => {
    if (cursorBlink.current) clearInterval(cursorBlink.current);
    cursorBlink.current = setInterval(() => setCursorOn((v) => !v), 530);
    return () => {
      if (cursorBlink.current) clearInterval(cursorBlink.current);
    };
  }, []);

  // Render visible chars split across segments
  let remaining = count;
  const parts: React.ReactNode[] = [];
  segments.forEach((seg, idx) => {
    const visible = Math.min(remaining, seg.text.length);
    remaining -= visible;
    if (visible > 0) {
      parts.push(
        <Text
          key={idx}
          style={
            seg.bold
              ? { fontFamily: fonts.headlineExtraBold }
              : undefined
          }
        >
          {seg.text.slice(0, visible)}
        </Text>,
      );
    }
  });

  const isDone = count >= fullText.length;

  return (
    <Text style={style}>
      {parts}
      {(!isDone || cursorOn) && (
        <Text style={{ color: isDone ? cursorColor : cursorColor, opacity: isDone ? (cursorOn ? 0.7 : 0) : 1 }}>|</Text>
      )}
    </Text>
  );
}

export default function Onboarding() {
  const router = useRouter();
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  const isReplay = replay === "1";
  const { colors } = useTheme();
  const [phase, setPhase] = useState<Phase>(isReplay ? "sage" : "name");
  const [name, setName] = useState("");
  const [charWarning, setCharWarning] = useState(false);
  const [sagePage, setSagePage] = useState(0);
  const [sageNextVisible, setSageNextVisible] = useState(false);
  const [tdNextVisible, setTdNextVisible] = useState(false);
  const [philoNextVisible, setPhiloNextVisible] = useState(false);
  const [philoReadyVisible, setPhiloReadyVisible] = useState(false);
  const [philoPage, setPhiloPage] = useState(0);

  // Typewriter active flags — one per line
  const [sage1Active, setSage1Active] = useState(false);
  const [sage2Active, setSage2Active] = useState(false);
  const [sage3Active, setSage3Active] = useState(false);
  const [sage4Active, setSage4Active] = useState(false);
  const [tdActionActive, setTdActionActive] = useState(false);
  const [tdMicroActive, setTdMicroActive] = useState(false);
  const [tdMicroMicroActive, setTdMicroMicroActive] = useState(false);
  const [philo0Active, setPhilo0Active] = useState(false);
  const [philo1Active, setPhilo1Active] = useState(false);
  const [philo2Active, setPhilo2Active] = useState(false);
  const [philo3Active, setPhilo3Active] = useState(false);
  const [philo4Active, setPhilo4Active] = useState(false);

  // Typing sound
  const soundRef = useRef<Audio.Sound | null>(null);
  useEffect(() => {
    Audio.Sound.createAsync(
      require("../assets/sounds/pencil-scratch.wav"),
      { volume: 0.12, shouldPlay: false },
    ).then(({ sound }) => {
      soundRef.current = sound;
    });
    return () => {
      soundRef.current?.unloadAsync();
    };
  }, []);

  // Animated values (for scribble arrows, buttons, progress — NOT text)
  const phOp = useRef(new Animated.Value(0)).current;
  const phTY = useRef(new Animated.Value(16)).current;
  const phSc = useRef(new Animated.Value(0.98)).current;
  const fieldOp = useRef(new Animated.Value(0)).current;
  const btnOp = useRef(new Animated.Value(0)).current;
  const sageNextOp = useRef(new Animated.Value(0)).current;
  const philoBtnOp = useRef(new Animated.Value(0)).current;
  const philoNextOp = useRef(new Animated.Value(0)).current;
  const tdScrib1Op = useRef(new Animated.Value(0)).current;
  const tdScrib2Op = useRef(new Animated.Value(0)).current;
  const tdScrib3Op = useRef(new Animated.Value(0)).current;
  const tdNextOp = useRef(new Animated.Value(0)).current;

  // Progress bar: 7 steps (sage p0, sage p1, template_demo, philo p0..p3)
  const TOTAL_STEPS = 7;
  const progressWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (phase === "name") return;
    let step = 0;
    if (phase === "sage") step = sagePage === 0 ? 1 : 2;
    else if (phase === "template_demo") step = 3;
    else if (phase === "philosophy") step = 4 + philoPage; // 4,5,6,7
    Animated.timing(progressWidth, {
      toValue: step / TOTAL_STEPS,
      duration: 400,
      easing: EASE_IO,
      useNativeDriver: false,
    }).start();
  }, [phase, sagePage, philoPage]);


  const tIn = useCallback(
    (cb?: () => void) => {
      phOp.setValue(0);
      phTY.setValue(16);
      phSc.setValue(0.98);
      Animated.parallel([
        Animated.timing(phOp, {
          toValue: 1,
          duration: 700,
          easing: EASE_OUT,
          useNativeDriver: true,
        }),
        Animated.timing(phTY, {
          toValue: 0,
          duration: 700,
          easing: EASE_OUT,
          useNativeDriver: true,
        }),
        Animated.timing(phSc, {
          toValue: 1,
          duration: 700,
          easing: EASE_OUT,
          useNativeDriver: true,
        }),
      ]).start(cb);
    },
    [phOp, phTY, phSc],
  );

  const tOut = useCallback(
    (cb?: () => void) => {
      Animated.parallel([
        Animated.timing(phOp, {
          toValue: 0,
          duration: 450,
          easing: EASE_IN,
          useNativeDriver: true,
        }),
        Animated.timing(phSc, {
          toValue: 0.98,
          duration: 450,
          easing: EASE_IN,
          useNativeDriver: true,
        }),
      ]).start(cb);
    },
    [phOp, phSc],
  );

  // NAME
  useEffect(() => {
    if (phase !== "name") return;
    fieldOp.setValue(0);
    tIn(() => {
      Animated.timing(fieldOp, {
        toValue: 1,
        duration: 500,
        easing: EASE_OUT,
        useNativeDriver: true,
      }).start();
    });
  }, [phase]);

  useEffect(() => {
    Animated.timing(btnOp, {
      toValue: name.trim().length >= 3 ? 1 : 0,
      duration: 280,
      easing: EASE_OUT,
      useNativeDriver: true,
    }).start();
  }, [name]);

  // SAGE — page 0: "You already know...", page 1: path/step/nudge
  useEffect(() => {
    if (phase !== "sage") return;
    sageNextOp.setValue(0);
    setSageNextVisible(false);
    setSage1Active(false);
    setSage2Active(false);
    setSage3Active(false);
    setSage4Active(false);

    if (sagePage === 0) {
      const t0 = setTimeout(() => setSage1Active(true), 300);
      return () => clearTimeout(t0);
    } else {
      const t0 = setTimeout(() => setSage2Active(true), 200);
      return () => clearTimeout(t0);
    }
  }, [phase, sagePage]);

  const handleSageNext = () => {
    if (sagePage === 0) {
      Animated.timing(sageNextOp, {
        toValue: 0,
        duration: 300,
        easing: EASE_IN,
        useNativeDriver: true,
      }).start(() => {
        setSage1Active(false);
        setSagePage(1);
      });
    } else {
      Animated.timing(sageNextOp, {
        toValue: 0,
        duration: 300,
        easing: EASE_IN,
        useNativeDriver: true,
      }).start(() => {
        setSage2Active(false);
        setSage3Active(false);
        setSage4Active(false);
        setPhase("template_demo");
      });
    }
  };

  // TEMPLATE DEMO
  useEffect(() => {
    if (phase !== "template_demo") return;
    tdScrib1Op.setValue(0);
    tdScrib2Op.setValue(0);
    tdScrib3Op.setValue(0);
    tdNextOp.setValue(0);
    setTdNextVisible(false);
    setTdActionActive(false);
    setTdMicroActive(false);
    setTdMicroMicroActive(false);

    // Action text starts typing at 300ms
    const t0 = setTimeout(() => setTdActionActive(true), 300);
    // Scribble 1 appears after action is ~done (~19 chars × 32ms = ~600ms after start)
    const t1 = setTimeout(() => {
      Animated.timing(tdScrib1Op, {
        toValue: 1,
        duration: 400,
        easing: EASE_OUT,
        useNativeDriver: true,
      }).start();
    }, 1400);
    // Micro action starts typing
    const t2 = setTimeout(() => setTdMicroActive(true), 2600);
    // Scribble 2
    const t3 = setTimeout(() => {
      Animated.timing(tdScrib2Op, {
        toValue: 1,
        duration: 400,
        easing: EASE_OUT,
        useNativeDriver: true,
      }).start();
    }, 3700);
    // Micro micro action starts typing
    const t4 = setTimeout(() => setTdMicroMicroActive(true), 4800);
    // Scribble 3
    const t5 = setTimeout(() => {
      Animated.timing(tdScrib3Op, {
        toValue: 1,
        duration: 400,
        easing: EASE_OUT,
        useNativeDriver: true,
      }).start();
    }, 5600);
    // Next button
    const t6 = setTimeout(() => {
      setTdNextVisible(true);
      Animated.timing(tdNextOp, {
        toValue: 1,
        duration: 500,
        easing: EASE_OUT,
        useNativeDriver: true,
      }).start();
    }, 7000);

    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
    };
  }, [phase]);

  // PHILOSOPHY — 4 pages
  useEffect(() => {
    if (phase !== "philosophy") return;
    philoNextOp.setValue(0);
    setPhiloNextVisible(false);
    setPhilo0Active(false);
    setPhilo1Active(false);
    setPhilo2Active(false);
    setPhilo3Active(false);
    setPhilo4Active(false);

    if (philoPage === 0) {
      const t0 = setTimeout(() => setPhilo0Active(true), 400);
      return () => clearTimeout(t0);
    } else if (philoPage === 1) {
      const t0 = setTimeout(() => setPhilo1Active(true), 400);
      return () => clearTimeout(t0);
    } else if (philoPage === 2) {
      const t0 = setTimeout(() => setPhilo2Active(true), 400);
      return () => clearTimeout(t0);
    } else {
      philoBtnOp.setValue(0);
      setPhiloReadyVisible(false);
      const t0 = setTimeout(() => setPhilo3Active(true), 400);
      return () => clearTimeout(t0);
    }
  }, [phase, philoPage]);

  const handlePhiloNext = () => {
    Animated.timing(philoNextOp, {
      toValue: 0,
      duration: 300,
      easing: EASE_IN,
      useNativeDriver: true,
    }).start(() => {
      setPhiloNextVisible(false);
      philoNextOp.setValue(0);
      setPhiloPage(philoPage + 1);
    });
  };

  const handlePhiloReady = () => {
    Animated.timing(philoBtnOp, {
      toValue: 0,
      duration: 300,
      easing: EASE_IN,
      useNativeDriver: true,
    }).start(() => handleFinish());
  };

  const handleNameSubmit = () => {
    const trimmed = name.trim();
    if (trimmed.length < 3) return;
    setName(trimmed);
    tOut(() => setPhase("sage"));
  };

  const handleTemplateNext = () => {
    Animated.parallel([
      Animated.timing(tdScrib1Op, {
        toValue: 0,
        duration: 300,
        easing: EASE_IN,
        useNativeDriver: true,
      }),
      Animated.timing(tdScrib2Op, {
        toValue: 0,
        duration: 300,
        easing: EASE_IN,
        useNativeDriver: true,
      }),
      Animated.timing(tdScrib3Op, {
        toValue: 0,
        duration: 300,
        easing: EASE_IN,
        useNativeDriver: true,
      }),
      Animated.timing(tdNextOp, {
        toValue: 0,
        duration: 300,
        easing: EASE_IN,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTdActionActive(false);
      setTdMicroActive(false);
      setTdMicroMicroActive(false);
      setPhiloPage(0);
      setPhase("philosophy");
    });
  };

  const handleFinish = async () => {
    if (isReplay) {
      router.back();
      return;
    }
    if (name.trim()) await saveProfile({ username: name.trim() });
    await setOnboarded(true);
    router.replace("/templates?onboarding=1");
  };

  return (
    <Animated.View
      style={[
        styles.root,
        {
          backgroundColor:
            phase === "template_demo" || phase === "philosophy"
              ? colors.surfaceContainerLow
              : colors.surface,
        },
      ]}
    >
      {/* Progress bar — visible on all screens after username */}
      {phase !== "name" && (
        <View style={[styles.progressTrack, { backgroundColor: colors.surfaceVariant }]}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.primary,
                width: progressWidth.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>
      )}

      {/* Name phase */}
      {phase === "name" && (
        <Animated.View
          style={[
            styles.body,
            {
              opacity: phOp,
              transform: [{ translateY: phTY }, { scale: phSc }],
            },
          ]}
        >
          {phase === "name" && (
            <View style={[styles.center, { paddingBottom: 48 }]}>
              <Text style={[styles.question, { color: colors.onSurface }]}>
                Choose a username
              </Text>
              <Animated.View
                style={{
                  opacity: fieldOp,
                  alignItems: "center",
                }}
              >
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.onSurface,
                      borderBottomColor: colors.surfaceVariant,
                    },
                  ]}
                  value={name}
                  onChangeText={(t) => {
                    const filtered = t
                      .replace(/[^a-zA-Z0-9]/g, "")
                      .slice(0, 15);
                    if (filtered !== t.slice(0, 15)) {
                      setCharWarning(true);
                      setTimeout(() => setCharWarning(false), 2000);
                    }
                    setName(filtered);
                  }}
                  placeholderTextColor={colors.outlineVariant}
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect={false}
                  onSubmitEditing={handleNameSubmit}
                  returnKeyType="next"
                  maxLength={15}
                />
                {charWarning && (
                  <Text
                    style={[
                      styles.charHint,
                      { color: colors.onSurfaceVariant },
                    ]}
                  >
                    Letters and numbers only
                  </Text>
                )}
              </Animated.View>
              <Animated.View style={[styles.btnWrap, { opacity: btnOp }]}>
                <TouchableOpacity
                  onPress={handleNameSubmit}
                  activeOpacity={0.3}
                  style={styles.ghostBtn}
                >
                  <Text style={[styles.plainBtn, { color: colors.onSurface }]}>
                    Continue
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          )}
        </Animated.View>
      )}

      {/* Sage — page 0: "You already know...", page 1: path/step/nudge */}
      {phase === "sage" && (
        <View style={styles.body}>
          <View style={styles.center}>
            {sagePage === 0 ? (
              <TypewriterText
                segments={makeSegs("You already know where you want to be...")}
                active={sage1Active}
                speed={34}
                style={[styles.sage, { color: colors.onSurfaceVariant }]}
                cursorColor={colors.onSurfaceVariant}
                soundRef={soundRef}
                onDone={() => {
                  setSageNextVisible(true);
                  Animated.timing(sageNextOp, {
                    toValue: 1,
                    duration: 500,
                    easing: EASE_OUT,
                    useNativeDriver: true,
                  }).start();
                }}
              />
            ) : (
              <>
                <TypewriterText
                  segments={makeSegs("But the path there is not a leap", ["leap"])}
                  active={sage2Active}
                  speed={30}
                  style={[styles.sage, { color: colors.onSurface }]}
                  cursorColor={colors.onSurface}
                  soundRef={soundRef}
                  onDone={() => setSage3Active(true)}
                />
                {sage3Active && (
                  <TypewriterText
                    segments={makeSegs("or even a step", ["step"])}
                    active={sage3Active}
                    speed={30}
                    style={[styles.sage, { color: colors.onSurface, marginTop: 16 }]}
                    cursorColor={colors.onSurface}
                    soundRef={soundRef}
                    onDone={() => setSage4Active(true)}
                  />
                )}
                {sage4Active && (
                  <TypewriterText
                    segments={makeSegs("It's a nudge", ["nudge"])}
                    active={sage4Active}
                    speed={30}
                    style={[styles.sage, { color: colors.onSurface, marginTop: 24 }]}
                    cursorColor={colors.onSurface}
                    soundRef={soundRef}
                    onDone={() => {
                      setSageNextVisible(true);
                      Animated.timing(sageNextOp, {
                        toValue: 1,
                        duration: 500,
                        easing: EASE_OUT,
                        useNativeDriver: true,
                      }).start();
                    }}
                  />
                )}
              </>
            )}
          </View>
          {sageNextVisible && (
            <Animated.View
              style={[styles.bottomBtnWrap, { opacity: sageNextOp }]}
            >
              <TouchableOpacity
                onPress={handleSageNext}
                activeOpacity={0.3}
                style={styles.ghostBtn}
              >
                <Text style={[styles.plainBtn, { color: colors.onSurface }]}>
                  Next
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      )}

      {/* Template demo screen */}
      {phase === "template_demo" && (
        <View style={[styles.body, { justifyContent: "center" }]}>
          <View style={{ paddingHorizontal: 28, width: "100%" }}>

            {/* Scribble label 1 — above Action field */}
            <Animated.View
              style={[styles.scribbleGroup, styles.scribRight, { opacity: tdScrib1Op }]}
            >
              <Text style={[styles.scrib, { color: colors.scribbleYellow }]}>
                This is your main goal
              </Text>
              <ScribbleArrow
                color={colors.scribbleYellow}
                flip={true}
                opacity={tdScrib1Op}
              />
            </Animated.View>

            {/* Action field */}
            <View>
              <Text style={[styles.tdLabel, { color: colors.onSurfaceVariant }]}>
                Action
              </Text>
              <View
                style={[
                  styles.tdField,
                  { borderColor: colors.outline, backgroundColor: colors.surfaceContainer },
                ]}
              >
                <TypewriterText
                  segments={makeSegs("Read for 30 minutes")}
                  active={tdActionActive}
                  speed={32}
                  style={[styles.tdFieldText, { color: colors.onSurface }]}
                  cursorColor={colors.onSurface}
                  soundRef={soundRef}
                />
              </View>
            </View>

            {/* Scribble label 2 — above Micro Action field */}
            <Animated.View
              style={[styles.scribbleGroup, styles.scribLeft, { opacity: tdScrib2Op, marginTop: 24 }]}
            >
              <Text style={[styles.scrib, { color: colors.scribbleYellow }]}>
                If that's too much, do this
              </Text>
              <ScribbleArrow
                color={colors.scribbleYellow}
                flip={false}
                opacity={tdScrib2Op}
              />
            </Animated.View>

            {/* Micro Action field */}
            <View>
              <Text style={[styles.tdLabel, { color: colors.onSurfaceVariant }]}>
                Micro Action
              </Text>
              <View
                style={[
                  styles.tdField,
                  { borderColor: colors.outline, backgroundColor: colors.surfaceContainer },
                ]}
              >
                <TypewriterText
                  segments={makeSegs("Read for 10 minutes")}
                  active={tdMicroActive}
                  speed={32}
                  style={[styles.tdFieldText, { color: colors.onSurface }]}
                  cursorColor={colors.onSurface}
                  soundRef={soundRef}
                />
              </View>
            </View>

            {/* Scribble label 3 — above Micro Micro Action field */}
            <Animated.View
              style={[styles.scribbleGroup, styles.scribRight, { opacity: tdScrib3Op, marginTop: 24 }]}
            >
              <Text style={[styles.scrib, { color: colors.scribbleYellow }]}>
                Add one more micro-action{"\n"}for maximum laziness!
              </Text>
              <ScribbleArrow
                color={colors.scribbleYellow}
                flip={true}
                opacity={tdScrib3Op}
              />
            </Animated.View>

            {/* Micro Micro Action field */}
            <View>
              <Text style={[styles.tdLabel, { color: colors.onSurfaceVariant }]}>
                Micro Micro Action
              </Text>
              <View
                style={[
                  styles.tdField,
                  { borderColor: colors.outline, backgroundColor: colors.surfaceContainer },
                ]}
              >
                <TypewriterText
                  segments={makeSegs("Read one page")}
                  active={tdMicroMicroActive}
                  speed={32}
                  style={[styles.tdFieldText, { color: colors.onSurface }]}
                  cursorColor={colors.onSurface}
                  soundRef={soundRef}
                />
              </View>
            </View>

          </View>

          {tdNextVisible && (
            <Animated.View style={[styles.bottomBtnWrap, { opacity: tdNextOp }]}>
              <TouchableOpacity
                activeOpacity={0.3}
                onPress={handleTemplateNext}
                style={styles.ghostBtn}
              >
                <Text style={[styles.plainBtn, { color: colors.onSurface }]}>
                  Next
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      )}

      {/* Philosophy screen — 4 pages */}
      {phase === "philosophy" && (
        <View style={[styles.body, { justifyContent: "center" }]}>
          <View style={styles.center}>
            {philoPage === 0 && (
              <TypewriterText
                segments={makeSegs(
                  "You may be wondering whether reading just one page is even worth it..."
                )}
                active={philo0Active}
                speed={30}
                style={[styles.philoText, { color: colors.onSurfaceVariant }]}
                cursorColor={colors.onSurfaceVariant}
                soundRef={soundRef}
                onDone={() => {
                  setPhiloNextVisible(true);
                  Animated.timing(philoNextOp, {
                    toValue: 1,
                    duration: 500,
                    easing: EASE_OUT,
                    useNativeDriver: true,
                  }).start();
                }}
              />
            )}

            {philoPage === 1 && (
              <TypewriterText
                segments={makeSegs(
                  "But it's not about the task, it's about the action",
                  ["task", "action"]
                )}
                active={philo1Active}
                speed={30}
                style={[styles.philoText, { color: colors.onSurface }]}
                cursorColor={colors.onSurface}
                soundRef={soundRef}
                onDone={() => {
                  setPhiloNextVisible(true);
                  Animated.timing(philoNextOp, {
                    toValue: 1,
                    duration: 500,
                    easing: EASE_OUT,
                    useNativeDriver: true,
                  }).start();
                }}
              />
            )}

            {philoPage === 2 && (
              <TypewriterText
                segments={makeSegs(
                  "Taking any initiative at all signals the brain that you've done something to improve yourself",
                  ["signals", "improve"]
                )}
                active={philo2Active}
                speed={30}
                style={[styles.philoText, { color: colors.onSurface }]}
                cursorColor={colors.onSurface}
                soundRef={soundRef}
                onDone={() => {
                  setPhiloNextVisible(true);
                  Animated.timing(philoNextOp, {
                    toValue: 1,
                    duration: 500,
                    easing: EASE_OUT,
                    useNativeDriver: true,
                  }).start();
                }}
              />
            )}

            {philoPage === 3 && (
              <>
                <TypewriterText
                  segments={makeSegs(
                    "Over time, that becomes not a history of what you've done"
                  )}
                  active={philo3Active}
                  speed={30}
                  style={[styles.philoText, { color: colors.onSurface }]}
                  cursorColor={colors.onSurface}
                  soundRef={soundRef}
                  onDone={() => setTimeout(() => setPhilo4Active(true), 800)}
                />
                {philo4Active && (
                  <TypewriterText
                    segments={makeSegs("But a proof of who you are", ["who you are"])}
                    active={philo4Active}
                    speed={30}
                    style={[styles.philoText, { color: colors.onSurface, marginTop: 16 }]}
                    cursorColor={colors.onSurface}
                    soundRef={soundRef}
                    onDone={() => {
                      setPhiloReadyVisible(true);
                      Animated.timing(philoBtnOp, {
                        toValue: 1,
                        duration: 500,
                        easing: EASE_OUT,
                        useNativeDriver: true,
                      }).start();
                    }}
                  />
                )}
              </>
            )}
          </View>

          {philoPage < 3 ? (
            philoNextVisible && (
              <Animated.View
                style={[styles.bottomBtnWrap, { opacity: philoNextOp }]}
              >
                <TouchableOpacity
                  activeOpacity={0.3}
                  onPress={handlePhiloNext}
                  style={styles.ghostBtn}
                >
                  <Text style={[styles.plainBtn, { color: colors.onSurface }]}>
                    Next
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )
          ) : (
            philoReadyVisible && (
              <Animated.View
                style={[styles.bottomBtnWrap, { opacity: philoBtnOp }]}
              >
                <TouchableOpacity
                  activeOpacity={0.3}
                  onPress={handlePhiloReady}
                  style={styles.ghostBtn}
                >
                  <Text style={[styles.plainBtn, { color: colors.onSurface }]}>
                    I'm Ready
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )
          )}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  progressTrack: {
    height: 3,
    width: "100%",
    borderRadius: 1.5,
    position: "absolute",
    top: 54,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  progressFill: {
    height: "100%",
    borderRadius: 1.5,
  },
  body: { flex: 1, justifyContent: "center", paddingHorizontal: 32 },
  center: { alignItems: "center" },
  question: {
    fontSize: 28,
    fontFamily: fonts.headlineExtraBold,
    textAlign: "center",
    marginBottom: 40,
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  input: {
    fontSize: 24,
    fontFamily: fonts.bodyRegular,
    borderBottomWidth: 2,
    paddingVertical: 12,
    paddingHorizontal: 4,
    textAlign: "center",
    minWidth: 60,
    marginBottom: 4,
  },
  charHint: {
    fontSize: 12,
    fontFamily: fonts.bodyRegular,
    marginBottom: 8,
  },
  btnWrap: { marginTop: 48 },
  ghostBtn: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderRadius: 10,
    borderColor: "rgba(128,128,128,0.25)",
  },
  plainBtn: {
    fontSize: 22,
    fontFamily: fonts.headlineExtraBold,
    textAlign: "center",
  },
  sage: {
    fontSize: 22,
    fontFamily: fonts.bodyMedium,
    textAlign: "center",
    lineHeight: 34,
    letterSpacing: -0.2,
    paddingHorizontal: 8,
  },
  introLabel: {
    fontSize: 20,
    fontFamily: fonts.bodyRegular,
    textAlign: "center",
    marginBottom: 6,
    lineHeight: 30,
  },
  goalLine: {
    fontSize: 28,
    fontFamily: fonts.headlineExtraBold,
    textAlign: "center",
    lineHeight: 38,
  },
  lineRow: { marginVertical: 12, alignItems: "center", width: "100%" },
  lineInner: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  strike: {
    position: "absolute",
    top: 18,
    left: -5,
    height: 3,
    borderRadius: 2,
    transform: [{ rotate: "-2deg" }],
  },
  ladderCard: {
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: "100%",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  cardText: {
    fontSize: 22,
    fontFamily: fonts.headlineBold,
    textAlign: "center",
  },
  scrib: {
    fontSize: 18,
    fontFamily: fonts.handwritten,
    textAlign: "center",
    marginBottom: 0,
  },
  scribbleGroup: {
    alignItems: "center",
    marginBottom: -4,
  },
  scribLeft: { alignSelf: "flex-start", marginLeft: 24 },
  scribRight: { alignSelf: "flex-end", marginRight: 24 },
  scribSlightLeft: { alignSelf: "flex-start", marginLeft: 40 },
  buildBtnWrap: { marginTop: 40, alignItems: "center" },
  bottomBtnWrap: {
    position: "absolute",
    bottom: 72,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  philoText: {
    fontSize: 19,
    fontFamily: fonts.bodyMedium,
    textAlign: "center",
    lineHeight: 30,
    letterSpacing: -0.2,
    paddingHorizontal: 8,
  },
  tdLabel: {
    fontSize: 12,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  tdField: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  tdFieldText: {
    fontSize: 17,
    fontFamily: fonts.bodyMedium,
  },
});
