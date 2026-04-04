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
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Audio } from "expo-av";
import Svg, { Path } from "react-native-svg";
import { setOnboarded, saveProfile } from "../src/storage";
import { useTheme, fonts } from "../src/theme";

const scratchSound = require("../assets/sounds/pencil-scratch.wav");

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PHASES = [
  "name",
  "sage",
  "transition",
  "ladder_intro",
  "ladder_build",
  "ladder_crossout",
  "ladder_scribble",
] as const;

type Phase = (typeof PHASES)[number];

const LADDER = [
  { core: "1 hour a day", prefix: "", suffix: "" },
  { core: "30 minutes a day", prefix: "How about ", suffix: "?" },
  { core: "10 minutes", prefix: "", suffix: "?" },
  { core: "one page", prefix: "How about ", suffix: "?" },
];

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

function useTypewriter(text: string, active: boolean, speed = 28) {
  const [out, setOut] = useState("");
  useEffect(() => {
    if (!active) {
      setOut("");
      return;
    }
    let i = 0;
    setOut("");
    const iv = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(iv);
    }, speed);
    return () => clearInterval(iv);
  }, [active, text, speed]);
  return out;
}

export default function Onboarding() {
  const router = useRouter();
  const { replay } = useLocalSearchParams<{ replay?: string }>();
  const isReplay = replay === "1";
  const { colors } = useTheme();
  const [phase, setPhase] = useState<Phase>(isReplay ? "sage" : "name");
  const [name, setName] = useState("");
  const [visibleLines, setVisibleLines] = useState<number[]>([]);
  const [showFirst, setShowFirst] = useState(true);
  const [scribStep, setScribStep] = useState(0);
  const [stripped, setStripped] = useState<Set<number>>(new Set());
  const [sageNextVisible, setSageNextVisible] = useState(false);
  const [scribbleNextVisible, setScribbleNextVisible] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Animated values
  const phOp = useRef(new Animated.Value(0)).current;
  const phTY = useRef(new Animated.Value(16)).current;
  const phSc = useRef(new Animated.Value(0.98)).current;
  const bgVal = useRef(new Animated.Value(0)).current;
  const fieldOp = useRef(new Animated.Value(0)).current;
  const btnOp = useRef(new Animated.Value(0)).current;
  const sage1Op = useRef(new Animated.Value(0)).current;
  const sage2Op = useRef(new Animated.Value(0)).current;
  const sageNextOp = useRef(new Animated.Value(0)).current;
  const introOp = useRef(new Animated.Value(0)).current;
  const introTY = useRef(new Animated.Value(12)).current;
  const goalOp = useRef(new Animated.Value(0)).current;
  const goalTY = useRef(new Animated.Value(12)).current;
  const lnOp = useRef(LADDER.map(() => new Animated.Value(0))).current;
  const lnTY = useRef(LADDER.map(() => new Animated.Value(22))).current;
  const pfxOp = useRef(LADDER.map(() => new Animated.Value(1))).current;
  const strikeW = useRef(new Animated.Value(0)).current;
  const firstOp = useRef(new Animated.Value(1)).current;
  const scOp = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  const scGrpOp = useRef(new Animated.Value(1)).current;
  const scribNextOp = useRef(new Animated.Value(0)).current;
  const allOp = useRef(new Animated.Value(1)).current;

  const pi = PHASES.indexOf(phase);
  const isLadder = pi >= 3;
  const isAutoLadder = pi >= 4;

  const s1 = useTypewriter("You will try this first", scribStep >= 1, 22);
  const s2 = useTypewriter("If that's too much, try this", scribStep >= 2, 22);
  const s3 = useTypewriter("And if THAT is too much", scribStep >= 3, 22);

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
      toValue: name.trim().length > 0 ? 1 : 0,
      duration: 280,
      easing: EASE_OUT,
      useNativeDriver: true,
    }).start();
  }, [name]);

  // SAGE (combined) — both sentences on one screen
  useEffect(() => {
    if (phase !== "sage") return;
    sage1Op.setValue(0);
    sage2Op.setValue(0);
    sageNextOp.setValue(0);
    setSageNextVisible(false);

    // Fade in first sentence
    Animated.timing(sage1Op, {
      toValue: 1,
      duration: 800,
      easing: EASE_OUT,
      useNativeDriver: true,
    }).start();

    // After delay, fade in second sentence
    const t1 = setTimeout(() => {
      Animated.timing(sage2Op, {
        toValue: 1,
        duration: 800,
        easing: EASE_OUT,
        useNativeDriver: true,
      }).start();
    }, 2000);

    // Show "Next" button ~1s after second sentence starts fading in
    const t2 = setTimeout(() => {
      setSageNextVisible(true);
      Animated.timing(sageNextOp, {
        toValue: 1,
        duration: 500,
        easing: EASE_OUT,
        useNativeDriver: true,
      }).start();
    }, 3800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [phase]);

  const handleSageNext = () => {
    // Fade both sentences out together, then transition
    Animated.parallel([
      Animated.timing(sage1Op, {
        toValue: 0,
        duration: 450,
        easing: EASE_IN,
        useNativeDriver: true,
      }),
      Animated.timing(sage2Op, {
        toValue: 0,
        duration: 450,
        easing: EASE_IN,
        useNativeDriver: true,
      }),
      Animated.timing(sageNextOp, {
        toValue: 0,
        duration: 300,
        easing: EASE_IN,
        useNativeDriver: true,
      }),
    ]).start(() => setPhase("transition"));
  };

  // TRANSITION
  useEffect(() => {
    if (phase !== "transition") return;
    Animated.timing(bgVal, {
      toValue: 1,
      duration: 1400,
      easing: EASE_IO,
      useNativeDriver: false,
    }).start(() => setTimeout(() => setPhase("ladder_intro"), 200));
  }, [phase]);

  // LADDER INTRO
  useEffect(() => {
    if (phase !== "ladder_intro") return;
    introOp.setValue(0);
    introTY.setValue(12);
    goalOp.setValue(0);
    goalTY.setValue(12);
    Animated.parallel([
      Animated.timing(introOp, {
        toValue: 1,
        duration: 650,
        easing: EASE_OUT,
        useNativeDriver: true,
      }),
      Animated.timing(introTY, {
        toValue: 0,
        duration: 650,
        easing: EASE_OUT,
        useNativeDriver: true,
      }),
    ]).start();
    const t1 = setTimeout(() => {
      Animated.parallel([
        Animated.timing(goalOp, {
          toValue: 1,
          duration: 550,
          easing: EASE_OUT,
          useNativeDriver: true,
        }),
        Animated.timing(goalTY, {
          toValue: 0,
          duration: 550,
          easing: EASE_OUT,
          useNativeDriver: true,
        }),
      ]).start();
    }, 500);
    const t2 = setTimeout(() => {
      Animated.parallel([
        Animated.timing(introOp, {
          toValue: 0,
          duration: 500,
          easing: EASE_IN,
          useNativeDriver: true,
        }),
        Animated.timing(introTY, {
          toValue: -8,
          duration: 500,
          easing: EASE_IN,
          useNativeDriver: true,
        }),
      ]).start(() => {
        Animated.timing(goalOp, {
          toValue: 0,
          duration: 300,
          easing: EASE_IN,
          useNativeDriver: true,
        }).start(() => {
          setVisibleLines([0]);
          lnOp[0].setValue(0);
          lnTY[0].setValue(0);
          Animated.timing(lnOp[0], {
            toValue: 1,
            duration: 400,
            easing: EASE_OUT,
            useNativeDriver: true,
          }).start(() => setPhase("ladder_build"));
        });
      });
    }, 2200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [phase]);

  // LADDER BUILD
  useEffect(() => {
    if (phase !== "ladder_build") return;
    let dead = false;
    const tt: ReturnType<typeof setTimeout>[] = [];
    const reveal = (i: number, delay: number) => {
      tt.push(
        setTimeout(() => {
          if (dead) return;
          lnOp[i].setValue(0);
          lnTY[i].setValue(24);
          setVisibleLines((p) => [...p, i]);
          Animated.parallel([
            Animated.timing(lnOp[i], {
              toValue: 1,
              duration: 550,
              easing: EASE_OUT,
              useNativeDriver: true,
            }),
            Animated.timing(lnTY[i], {
              toValue: 0,
              duration: 550,
              easing: EASE_OUT,
              useNativeDriver: true,
            }),
          ]).start();
          tt.push(
            setTimeout(() => {
              if (dead) return;
              Animated.timing(pfxOp[i], {
                toValue: 0,
                duration: 450,
                easing: EASE_IN,
                useNativeDriver: true,
              }).start(() => {
                LayoutAnimation.configureNext({
                  duration: 350,
                  update: { type: LayoutAnimation.Types.easeInEaseOut },
                });
                setStripped((prev) => new Set(prev).add(i));
              });
            }, 700),
          );
        }, delay),
      );
    };
    reveal(1, 700);
    reveal(2, 2100);
    reveal(3, 3500);
    tt.push(
      setTimeout(() => {
        if (!dead) setPhase("ladder_crossout");
      }, 5000),
    );
    return () => {
      dead = true;
      tt.forEach(clearTimeout);
    };
  }, [phase]);

  // LADDER CROSSOUT
  useEffect(() => {
    if (phase !== "ladder_crossout") return;
    strikeW.setValue(0);
    Animated.timing(strikeW, {
      toValue: 1,
      duration: 650,
      easing: EASE_IO,
      useNativeDriver: false,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(firstOp, {
          toValue: 0,
          duration: 450,
          easing: EASE_IN,
          useNativeDriver: true,
        }).start(() => {
          LayoutAnimation.configureNext({
            duration: 500,
            update: { type: LayoutAnimation.Types.easeInEaseOut },
          });
          setShowFirst(false);
          setTimeout(() => setPhase("ladder_scribble"), 500);
        });
      }, 350);
    });
  }, [phase]);

  // LADDER SCRIBBLE
  useEffect(() => {
    if (phase !== "ladder_scribble") return;
    scGrpOp.setValue(1);
    setScribStep(0);
    scOp.forEach((v) => v.setValue(0));
    const playScribble = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(scratchSound, {
          volume: 0.3,
        });
        soundRef.current = sound;
        await sound.playAsync();
        sound.setOnPlaybackStatusUpdate((s) => {
          if ("didJustFinish" in s && s.didJustFinish) sound.unloadAsync();
        });
      } catch {
        /* sound load failure is non-fatal */
      }
    };
    const show = (i: number, d: number) =>
      setTimeout(() => {
        setScribStep(i + 1);
        playScribble();
        Animated.timing(scOp[i], {
          toValue: 1,
          duration: 350,
          easing: EASE_OUT,
          useNativeDriver: true,
        }).start();
      }, d);
    const t1 = show(0, 400);
    const t2 = show(1, 1700);
    const t3 = show(2, 3000);
    // After all scribble annotations, show "Next" button
    const t4 = setTimeout(() => {
      setScribbleNextVisible(true);
      scribNextOp.setValue(0);
      Animated.timing(scribNextOp, {
        toValue: 1,
        duration: 500,
        easing: EASE_OUT,
        useNativeDriver: true,
      }).start();
    }, 4500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [phase]);

  const handleNameSubmit = () => {
    const trimmed = name.trim();
    if (trimmed) {
      setName(trimmed);
      tOut(() => setPhase("sage"));
    }
  };

  const handleScribbleNext = () => {
    Animated.parallel([
      Animated.timing(scGrpOp, {
        toValue: 0,
        duration: 500,
        easing: EASE_IN,
        useNativeDriver: true,
      }),
      Animated.timing(scribNextOp, {
        toValue: 0,
        duration: 300,
        easing: EASE_IN,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setScribStep(0);
      Animated.timing(allOp, {
        toValue: 0,
        duration: 700,
        easing: EASE_IN,
        useNativeDriver: true,
      }).start(() => handleFinish());
    });
  };

  const handleFinish = async () => {
    if (isReplay) {
      router.back();
      return;
    }
    if (name.trim()) await saveProfile({ name: name.trim() });
    await setOnboarded(true);
    router.replace("/templates?onboarding=1");
  };

  const bgColor = bgVal.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.surface, colors.surfaceContainerLow],
  });

  return (
    <Animated.View
      style={[
        styles.root,
        { backgroundColor: isLadder ? colors.surfaceContainerLow : bgColor },
      ]}
    >
      {/* Non-ladder phases */}
      {!isLadder && phase !== "sage" && (
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
            <View style={styles.center}>
              <Text style={[styles.question, { color: colors.onSurface }]}>
                What is your name?
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
                    const filtered = t.replace(/[^a-zA-Z ]/g, "").slice(0, 20);
                    setName(filtered);
                  }}
                  placeholderTextColor={colors.outlineVariant}
                  autoFocus
                  onSubmitEditing={handleNameSubmit}
                  returnKeyType="next"
                  maxLength={20}
                />
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

          {phase === "transition" && <View />}
        </Animated.View>
      )}

      {/* Sage (combined) — both sentences on one screen */}
      {phase === "sage" && (
        <View style={styles.body}>
          <View style={styles.center}>
            <Animated.Text
              style={[
                styles.sage,
                { color: colors.onSurface, opacity: sage1Op },
              ]}
            >
              You already know where you want to be.
            </Animated.Text>
            <Animated.Text
              style={[
                styles.sage,
                { color: colors.onSurface, opacity: sage2Op, marginTop: 24 },
              ]}
            >
              The path there is not a leap, or even a step{"\n"}— it's a nudge.
            </Animated.Text>
            {sageNextVisible && (
              <Animated.View style={[styles.btnWrap, { opacity: sageNextOp }]}>
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
        </View>
      )}

      {/* Ladder phases */}
      {isLadder && (
        <Animated.View style={[styles.body, { opacity: allOp }]}>
          <View style={styles.center}>
            {phase === "ladder_intro" && (
              <>
                <Animated.Text
                  style={[
                    styles.introLabel,
                    {
                      color: colors.onSurface,
                      opacity: introOp,
                      transform: [{ translateY: introTY }],
                    },
                  ]}
                >
                  Let's say your goal is to read
                </Animated.Text>
                <Animated.Text
                  style={[
                    styles.goalLine,
                    {
                      color: colors.onSurface,
                      opacity: goalOp,
                      transform: [{ translateY: goalTY }],
                    },
                  ]}
                >
                  1 hour a day.
                </Animated.Text>
              </>
            )}

            {isAutoLadder &&
              visibleLines.map((li) => {
                if (li === 0 && !showFirst) return null;
                const d = LADDER[li];
                const isF = li === 0;
                const hasAffix = d.prefix !== "" || d.suffix !== "";
                return (
                  <Animated.View
                    key={li}
                    style={[
                      styles.lineRow,
                      {
                        opacity: isF
                          ? Animated.multiply(lnOp[li], firstOp)
                          : lnOp[li],
                        transform: [{ translateY: lnTY[li] }],
                      },
                    ]}
                  >
                    {phase === "ladder_scribble" && li > 0 && (
                      <View
                        style={[
                          styles.scribbleGroup,
                          li === 1
                            ? styles.scribLeft
                            : li === 2
                              ? styles.scribRight
                              : styles.scribSlightLeft,
                        ]}
                      >
                        <Animated.Text
                          style={[
                            styles.scrib,
                            {
                              color: colors.scribbleYellow,
                              opacity: Animated.multiply(scOp[li - 1], scGrpOp),
                            },
                          ]}
                        >
                          {li === 1 && s1}
                          {li === 2 && s2}
                          {li === 3 && s3}
                        </Animated.Text>
                        <ScribbleArrow
                          color={colors.scribbleYellow}
                          flip={li === 2}
                          opacity={Animated.multiply(scOp[li - 1], scGrpOp)}
                        />
                      </View>
                    )}
                    {isF ? (
                      <View>
                        {hasAffix && !stripped.has(li) ? (
                          <View style={styles.lineInner}>
                            {d.prefix !== "" && (
                              <Animated.Text
                                style={[
                                  styles.goalLine,
                                  {
                                    color: colors.onSurface,
                                    opacity: pfxOp[li],
                                  },
                                ]}
                              >
                                {d.prefix}
                              </Animated.Text>
                            )}
                            <Text
                              style={[
                                styles.goalLine,
                                { color: colors.onSurface, opacity: 0.4 },
                              ]}
                            >
                              {d.core}
                            </Text>
                            {d.suffix !== "" && (
                              <Animated.Text
                                style={[
                                  styles.goalLine,
                                  {
                                    color: colors.onSurface,
                                    opacity: pfxOp[li],
                                  },
                                ]}
                              >
                                {d.suffix}
                              </Animated.Text>
                            )}
                          </View>
                        ) : (
                          <Text
                            style={[
                              styles.goalLine,
                              { color: colors.onSurface, opacity: 0.4 },
                            ]}
                          >
                            {d.core}
                          </Text>
                        )}
                        {phase === "ladder_crossout" && (
                          <Animated.View
                            style={[
                              styles.strike,
                              {
                                backgroundColor: colors.scribbleRed,
                                width: strikeW.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: ["0%", "110%"],
                                }),
                              },
                            ]}
                          />
                        )}
                      </View>
                    ) : (
                      <View style={styles.ladderCard}>
                        {hasAffix && !stripped.has(li) ? (
                          <View style={styles.lineInner}>
                            {d.prefix !== "" && (
                              <Animated.Text
                                style={[
                                  styles.cardText,
                                  {
                                    color: colors.onSurface,
                                    opacity: pfxOp[li],
                                  },
                                ]}
                              >
                                {d.prefix}
                              </Animated.Text>
                            )}
                            <Text
                              style={[
                                styles.cardText,
                                { color: colors.onSurface },
                              ]}
                            >
                              {d.core}
                            </Text>
                            {d.suffix !== "" && (
                              <Animated.Text
                                style={[
                                  styles.cardText,
                                  {
                                    color: colors.onSurface,
                                    opacity: pfxOp[li],
                                  },
                                ]}
                              >
                                {d.suffix}
                              </Animated.Text>
                            )}
                          </View>
                        ) : (
                          <Text
                            style={[
                              styles.cardText,
                              { color: colors.onSurface },
                            ]}
                          >
                            {d.core}
                          </Text>
                        )}
                      </View>
                    )}
                  </Animated.View>
                );
              })}

            {phase === "ladder_scribble" && scribbleNextVisible && (
              <Animated.View
                style={[styles.buildBtnWrap, { opacity: scribNextOp }]}
              >
                <TouchableOpacity
                  activeOpacity={0.3}
                  onPress={handleScribbleNext}
                  style={styles.ghostBtn}
                >
                  <Text style={[styles.plainBtn, { color: colors.onSurface }]}>
                    Next
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
    marginBottom: 12,
  },
  btnWrap: { marginTop: 48 },
  ghostBtn: {
    paddingVertical: 12,
    paddingHorizontal: 32,
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
});
