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
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Audio } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import { setOnboarded, saveProfile } from "../src/storage";
import { useTheme, fonts } from "../src/theme";

const scratchSound = require("../assets/sounds/pencil-scratch.wav");

const { width: SCREEN_W } = Dimensions.get("window");

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PHASES = [
  "name",
  "sage1",
  "sage2",
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
  const { colors } = useTheme();
  const [phase, setPhase] = useState<Phase>("name");
  const [name, setName] = useState("");
  const [visibleLines, setVisibleLines] = useState<number[]>([]);
  const [showFirst, setShowFirst] = useState(true);
  const [scribStep, setScribStep] = useState(0);
  const [stripped, setStripped] = useState<Set<number>>(new Set());
  const soundRef = useRef<Audio.Sound | null>(null);

  // Animated values
  const phOp = useRef(new Animated.Value(0)).current;
  const phTY = useRef(new Animated.Value(16)).current;
  const phSc = useRef(new Animated.Value(0.98)).current;
  const progVal = useRef(new Animated.Value(0)).current;
  const bgVal = useRef(new Animated.Value(0)).current;
  const fieldOp = useRef(new Animated.Value(0)).current;
  const btnOp = useRef(new Animated.Value(0)).current;
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
  const allOp = useRef(new Animated.Value(1)).current;

  const pi = PHASES.indexOf(phase);
  const isLadder = pi >= 4;
  const isAutoLadder = pi >= 5;

  const s1 = useTypewriter("You will try this first", scribStep >= 1, 22);
  const s2 = useTypewriter("If that's too much, try this", scribStep >= 2, 22);
  const s3 = useTypewriter("And if that's too much", scribStep >= 3, 22);

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

  // Progress bar
  useEffect(() => {
    Animated.spring(progVal, {
      toValue: (pi + 1) / PHASES.length,
      tension: 40,
      friction: 10,
      useNativeDriver: false,
    }).start();
  }, [phase]);

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

  // SAGE 1
  useEffect(() => {
    if (phase !== "sage1") return;
    tIn();
    const t = setTimeout(() => tOut(() => setPhase("sage2")), 3000);
    return () => clearTimeout(t);
  }, [phase]);

  // SAGE 2
  useEffect(() => {
    if (phase !== "sage2") return;
    tIn();
    const t = setTimeout(() => tOut(() => setPhase("transition")), 4000);
    return () => clearTimeout(t);
  }, [phase]);

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
      } catch {}
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
    const t4 = setTimeout(() => {
      Animated.timing(scGrpOp, {
        toValue: 0,
        duration: 500,
        easing: EASE_IN,
        useNativeDriver: true,
      }).start(() => {
        setScribStep(0);
        setTimeout(() => {
          Animated.timing(allOp, {
            toValue: 0,
            duration: 700,
            easing: EASE_IN,
            useNativeDriver: true,
          }).start(() => handleFinish());
        }, 400);
      });
    }, 4800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [phase]);

  const handleNameSubmit = () => {
    if (name.trim()) tOut(() => setPhase("sage1"));
  };

  const handleFinish = async () => {
    if (name.trim()) await saveProfile({ name: name.trim() });
    await setOnboarded(true);
    router.replace("/theme-select");
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
      {/* Progress bar */}
      <Animated.View style={[styles.progWrap, { opacity: allOp }]}>
        <View
          style={[
            styles.progTrack,
            { backgroundColor: colors.surfaceContainer },
          ]}
        >
          <Animated.View
            style={[
              styles.progFill,
              {
                backgroundColor: colors.primaryContainer,
                width: progVal.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>
      </Animated.View>

      {/* Non-ladder phases */}
      {!isLadder && (
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
              <Text style={[styles.stepLabel, { color: colors.secondary }]}>
                STEP 01 / 04
              </Text>
              <Text style={[styles.question, { color: colors.onSurface }]}>
                What is your{"\n"}name?
              </Text>
              <Animated.View
                style={{
                  opacity: fieldOp,
                  width: "100%",
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
                  onChangeText={setName}
                  placeholder="Type your name here..."
                  placeholderTextColor={colors.outlineVariant}
                  autoFocus
                  onSubmitEditing={handleNameSubmit}
                  returnKeyType="next"
                  maxLength={30}
                />
                <Text style={[styles.inputHint, { color: colors.secondary }]}>
                  This is how we'll address you in your journal
                </Text>
              </Animated.View>
              <Animated.View style={[styles.btnWrap, { opacity: btnOp }]}>
                <TouchableOpacity
                  onPress={handleNameSubmit}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.primaryContainer]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradientBtn}
                  >
                    <Text
                      style={[styles.btnLabel, { color: colors.onPrimary }]}
                    >
                      Continue
                    </Text>
                    <Text
                      style={[styles.btnArrow, { color: colors.onPrimary }]}
                    >
                      →
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </View>
          )}

          {phase === "sage1" && (
            <View style={styles.center}>
              <Text style={[styles.sage, { color: colors.onSurface }]}>
                You already know where you want to be.
              </Text>
            </View>
          )}

          {phase === "sage2" && (
            <View style={styles.center}>
              <Text style={[styles.sage, { color: colors.onSurface }]}>
                The path there is not a leap, or even a step{"\n"}— it's a
                nudge.
              </Text>
            </View>
          )}

          {phase === "transition" && <View />}
        </Animated.View>
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
                    {/* Scribble annotation */}
                    {phase === "ladder_scribble" && li > 0 && (
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
                    )}
                    {/* Card or plain text for first line */}
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
                      <View
                        style={[
                          styles.ladderCard,
                          { backgroundColor: colors.surfaceContainerLowest },
                        ]}
                      >
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

            {/* Build My Habit button — visible at scribble phase */}
            {phase === "ladder_scribble" && (
              <View style={styles.buildBtnWrap}>
                <TouchableOpacity activeOpacity={0.8} onPress={handleFinish}>
                  <LinearGradient
                    colors={[colors.primary, colors.primaryContainer]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradientBtn}
                  >
                    <Text
                      style={[styles.btnLabel, { color: colors.onPrimary }]}
                    >
                      Build My Habit
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  progWrap: { paddingTop: 56, paddingHorizontal: 32 },
  progTrack: { height: 3, borderRadius: 2, overflow: "hidden" },
  progFill: { height: "100%", borderRadius: 2 },
  body: { flex: 1, justifyContent: "center", paddingHorizontal: 32 },
  center: { alignItems: "center" },
  stepLabel: {
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 24,
  },
  question: {
    fontSize: 36,
    fontFamily: fonts.headlineExtraBold,
    textAlign: "center",
    marginBottom: 40,
    letterSpacing: -0.5,
    lineHeight: 44,
  },
  input: {
    fontSize: 24,
    fontFamily: fonts.bodyRegular,
    borderBottomWidth: 2,
    paddingVertical: 12,
    paddingHorizontal: 4,
    textAlign: "left",
    width: SCREEN_W * 0.75,
    marginBottom: 12,
  },
  inputHint: {
    fontSize: 13,
    fontFamily: fonts.bodyMedium,
    fontStyle: "italic",
    opacity: 0.6,
    alignSelf: "flex-start",
    marginLeft: (SCREEN_W - SCREEN_W * 0.75) / 2 - 32,
  },
  btnWrap: { marginTop: 48, width: "100%" },
  gradientBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 32,
    gap: 8,
  },
  btnLabel: { fontSize: 18, fontFamily: fonts.headlineBold },
  btnArrow: { fontSize: 20 },
  sage: {
    fontSize: 24,
    fontFamily: fonts.bodyMedium,
    textAlign: "center",
    lineHeight: 36,
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
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
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
    marginBottom: 8,
  },
  buildBtnWrap: { marginTop: 40, width: "100%" },
});
