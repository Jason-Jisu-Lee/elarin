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
  const [charWarning, setCharWarning] = useState(false);
  const [sagePage, setSagePage] = useState(0);
  const [sageNextVisible, setSageNextVisible] = useState(false);
  const [tdNextVisible, setTdNextVisible] = useState(false);
  const [philoReadyVisible, setPhiloReadyVisible] = useState(false);
  const [philoPage, setPhiloPage] = useState(0);

  // Animated values
  const phOp = useRef(new Animated.Value(0)).current;
  const phTY = useRef(new Animated.Value(16)).current;
  const phSc = useRef(new Animated.Value(0.98)).current;
  const fieldOp = useRef(new Animated.Value(0)).current;
  const btnOp = useRef(new Animated.Value(0)).current;
  const sage1Op = useRef(new Animated.Value(0)).current;
  const sage2Op = useRef(new Animated.Value(0)).current;
  const sage3Op = useRef(new Animated.Value(0)).current;
  const sage4Op = useRef(new Animated.Value(0)).current;
  const sageNextOp = useRef(new Animated.Value(0)).current;
  const philoOp = useRef(
    [0, 1, 2, 3, 4].map(() => new Animated.Value(0)),
  ).current;
  const philoBtnOp = useRef(new Animated.Value(0)).current;
  const philoNextOp = useRef(new Animated.Value(0)).current;
  const tdActionOp = useRef(new Animated.Value(0)).current;
  const tdMicroOp = useRef(new Animated.Value(0)).current;
  const tdScrib1Op = useRef(new Animated.Value(0)).current;
  const tdScrib2Op = useRef(new Animated.Value(0)).current;
  const tdMicroMicroOp = useRef(new Animated.Value(0)).current;
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

    if (sagePage === 0) {
      sage1Op.setValue(0);
      Animated.timing(sage1Op, {
        toValue: 1,
        duration: 800,
        easing: EASE_OUT,
        useNativeDriver: true,
      }).start();

      const t0 = setTimeout(() => {
        setSageNextVisible(true);
        Animated.timing(sageNextOp, {
          toValue: 1,
          duration: 500,
          easing: EASE_OUT,
          useNativeDriver: true,
        }).start();
      }, 2200);

      return () => clearTimeout(t0);
    } else {
      sage2Op.setValue(0);
      sage3Op.setValue(0);
      sage4Op.setValue(0);

      Animated.timing(sage2Op, {
        toValue: 1,
        duration: 800,
        easing: EASE_OUT,
        useNativeDriver: true,
      }).start();

      const t1 = setTimeout(() => {
        Animated.timing(sage3Op, {
          toValue: 1,
          duration: 800,
          easing: EASE_OUT,
          useNativeDriver: true,
        }).start();
      }, 1800);

      const t2 = setTimeout(() => {
        Animated.timing(sage4Op, {
          toValue: 1,
          duration: 800,
          easing: EASE_OUT,
          useNativeDriver: true,
        }).start();
      }, 3600);

      const t3 = setTimeout(() => {
        setSageNextVisible(true);
        Animated.timing(sageNextOp, {
          toValue: 1,
          duration: 500,
          easing: EASE_OUT,
          useNativeDriver: true,
        }).start();
      }, 5300);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [phase, sagePage]);

  const handleSageNext = () => {
    if (sagePage === 0) {
      Animated.parallel([
        Animated.timing(sage1Op, {
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
      ]).start(() => setSagePage(1));
    } else {
      Animated.parallel([
        Animated.timing(sage2Op, {
          toValue: 0,
          duration: 450,
          easing: EASE_IN,
          useNativeDriver: true,
        }),
        Animated.timing(sage3Op, {
          toValue: 0,
          duration: 450,
          easing: EASE_IN,
          useNativeDriver: true,
        }),
        Animated.timing(sage4Op, {
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
      ]).start(() => setPhase("template_demo"));
    }
  };

  // TEMPLATE DEMO
  useEffect(() => {
    if (phase !== "template_demo") return;
    tdActionOp.setValue(0);
    tdMicroOp.setValue(0);
    tdScrib1Op.setValue(0);
    tdScrib2Op.setValue(0);
    tdMicroMicroOp.setValue(0);
    tdScrib3Op.setValue(0);
    tdNextOp.setValue(0);
    setTdNextVisible(false);

    const t0 = setTimeout(() => {
      Animated.timing(tdActionOp, {
        toValue: 1,
        duration: 600,
        easing: EASE_OUT,
        useNativeDriver: true,
      }).start();
    }, 300);

    const t1 = setTimeout(() => {
      Animated.timing(tdScrib1Op, {
        toValue: 1,
        duration: 400,
        easing: EASE_OUT,
        useNativeDriver: true,
      }).start();
    }, 1300);

    const t2 = setTimeout(() => {
      Animated.timing(tdMicroOp, {
        toValue: 1,
        duration: 600,
        easing: EASE_OUT,
        useNativeDriver: true,
      }).start();
    }, 2600);

    const t3 = setTimeout(() => {
      Animated.timing(tdScrib2Op, {
        toValue: 1,
        duration: 400,
        easing: EASE_OUT,
        useNativeDriver: true,
      }).start();
    }, 3600);

    const t4 = setTimeout(() => {
      Animated.timing(tdMicroMicroOp, {
        toValue: 1,
        duration: 600,
        easing: EASE_OUT,
        useNativeDriver: true,
      }).start();
    }, 4800);

    const t5 = setTimeout(() => {
      Animated.timing(tdScrib3Op, {
        toValue: 1,
        duration: 400,
        easing: EASE_OUT,
        useNativeDriver: true,
      }).start();
    }, 5800);

    const t6 = setTimeout(() => {
      setTdNextVisible(true);
      Animated.timing(tdNextOp, {
        toValue: 1,
        duration: 500,
        easing: EASE_OUT,
        useNativeDriver: true,
      }).start();
    }, 7200);

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

    if (philoPage === 0) {
      philoOp[0].setValue(0);
      const t0 = setTimeout(() => {
        Animated.timing(philoOp[0], {
          toValue: 1,
          duration: 900,
          easing: EASE_OUT,
          useNativeDriver: true,
        }).start();
      }, 400);
      const t1 = setTimeout(() => {
        Animated.timing(philoNextOp, {
          toValue: 1,
          duration: 600,
          easing: EASE_OUT,
          useNativeDriver: true,
        }).start();
      }, 3500);
      return () => { clearTimeout(t0); clearTimeout(t1); };
    } else if (philoPage === 1) {
      philoOp[1].setValue(0);
      const t0 = setTimeout(() => {
        Animated.timing(philoOp[1], {
          toValue: 1,
          duration: 900,
          easing: EASE_OUT,
          useNativeDriver: true,
        }).start();
      }, 400);
      const t1 = setTimeout(() => {
        Animated.timing(philoNextOp, {
          toValue: 1,
          duration: 600,
          easing: EASE_OUT,
          useNativeDriver: true,
        }).start();
      }, 3500);
      return () => { clearTimeout(t0); clearTimeout(t1); };
    } else if (philoPage === 2) {
      philoOp[2].setValue(0);
      const t0 = setTimeout(() => {
        Animated.timing(philoOp[2], {
          toValue: 1,
          duration: 900,
          easing: EASE_OUT,
          useNativeDriver: true,
        }).start();
      }, 400);
      const t1 = setTimeout(() => {
        Animated.timing(philoNextOp, {
          toValue: 1,
          duration: 600,
          easing: EASE_OUT,
          useNativeDriver: true,
        }).start();
      }, 3500);
      return () => { clearTimeout(t0); clearTimeout(t1); };
    } else {
      philoOp[3].setValue(0);
      philoOp[4].setValue(0);
      philoBtnOp.setValue(0);
      setPhiloReadyVisible(false);

      const t0 = setTimeout(() => {
        Animated.timing(philoOp[3], {
          toValue: 1,
          duration: 900,
          easing: EASE_OUT,
          useNativeDriver: true,
        }).start();
      }, 400);

      const t1 = setTimeout(() => {
        Animated.timing(philoOp[4], {
          toValue: 1,
          duration: 900,
          easing: EASE_OUT,
          useNativeDriver: true,
        }).start();
      }, 3000);

      const t2 = setTimeout(() => {
        setPhiloReadyVisible(true);
        Animated.timing(philoBtnOp, {
          toValue: 1,
          duration: 600,
          easing: EASE_OUT,
          useNativeDriver: true,
        }).start();
      }, 5000);

      return () => {
        clearTimeout(t0);
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [phase, philoPage]);

  const handlePhiloNext = () => {
    const currentOp = philoOp[philoPage];
    Animated.parallel([
      Animated.timing(currentOp, {
        toValue: 0,
        duration: 450,
        easing: EASE_IN,
        useNativeDriver: true,
      }),
      Animated.timing(philoNextOp, {
        toValue: 0,
        duration: 300,
        easing: EASE_IN,
        useNativeDriver: true,
      }),
    ]).start(() => setPhiloPage(philoPage + 1));
  };

  const handlePhiloReady = () => {
    Animated.parallel([
      Animated.timing(philoOp[2], {
        toValue: 0,
        duration: 450,
        easing: EASE_IN,
        useNativeDriver: true,
      }),
      Animated.timing(philoOp[3], {
        toValue: 0,
        duration: 450,
        easing: EASE_IN,
        useNativeDriver: true,
      }),
      Animated.timing(philoOp[4], {
        toValue: 0,
        duration: 450,
        easing: EASE_IN,
        useNativeDriver: true,
      }),
      Animated.timing(philoBtnOp, {
        toValue: 0,
        duration: 300,
        easing: EASE_IN,
        useNativeDriver: true,
      }),
    ]).start(() => handleFinish());
  };

  const handleNameSubmit = () => {
    const trimmed = name.trim();
    if (trimmed.length < 3) return;
    setName(trimmed);
    tOut(() => setPhase("sage"));
  };

  const handleTemplateNext = () => {
    Animated.parallel([
      Animated.timing(tdActionOp, {
        toValue: 0,
        duration: 400,
        easing: EASE_IN,
        useNativeDriver: true,
      }),
      Animated.timing(tdMicroOp, {
        toValue: 0,
        duration: 400,
        easing: EASE_IN,
        useNativeDriver: true,
      }),
      Animated.timing(tdMicroMicroOp, {
        toValue: 0,
        duration: 400,
        easing: EASE_IN,
        useNativeDriver: true,
      }),
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
              <Animated.Text
                style={[
                  styles.sage,
                  { color: colors.onSurfaceVariant, opacity: sage1Op },
                ]}
              >
                You already know where you want to be...
              </Animated.Text>
            ) : (
              <>
                <Animated.Text
                  style={[
                    styles.sage,
                    { color: colors.onSurface, opacity: sage2Op },
                  ]}
                >
                  But the path there is not a{" "}
                  <Text style={{ fontFamily: fonts.headlineExtraBold }}>
                    leap
                  </Text>
                </Animated.Text>
                <Animated.Text
                  style={[
                    styles.sage,
                    {
                      color: colors.onSurface,
                      opacity: sage3Op,
                      marginTop: 16,
                    },
                  ]}
                >
                  or even a{" "}
                  <Text style={{ fontFamily: fonts.headlineExtraBold }}>
                    step
                  </Text>
                </Animated.Text>
                <Animated.Text
                  style={[
                    styles.sage,
                    {
                      color: colors.onSurface,
                      opacity: sage4Op,
                      marginTop: 24,
                    },
                  ]}
                >
                  It's a{" "}
                  <Text style={{ fontFamily: fonts.headlineExtraBold }}>
                    nudge
                  </Text>
                </Animated.Text>
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
            <Animated.View style={{ opacity: tdActionOp }}>
              <Text style={[styles.tdLabel, { color: colors.onSurfaceVariant }]}>
                Action
              </Text>
              <View
                style={[
                  styles.tdField,
                  { borderColor: colors.outline, backgroundColor: colors.surfaceContainer },
                ]}
              >
                <Text style={[styles.tdFieldText, { color: colors.onSurface }]}>
                  Read for 30 minutes
                </Text>
              </View>
            </Animated.View>

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
            <Animated.View style={{ opacity: tdMicroOp }}>
              <Text style={[styles.tdLabel, { color: colors.onSurfaceVariant }]}>
                Micro Action
              </Text>
              <View
                style={[
                  styles.tdField,
                  { borderColor: colors.outline, backgroundColor: colors.surfaceContainer },
                ]}
              >
                <Text style={[styles.tdFieldText, { color: colors.onSurface }]}>
                  Read for 10 minutes
                </Text>
              </View>
            </Animated.View>

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
            <Animated.View style={{ opacity: tdMicroMicroOp }}>
              <Text style={[styles.tdLabel, { color: colors.onSurfaceVariant }]}>
                Micro Micro Action
              </Text>
              <View
                style={[
                  styles.tdField,
                  { borderColor: colors.outline, backgroundColor: colors.surfaceContainer },
                ]}
              >
                <Text style={[styles.tdFieldText, { color: colors.onSurface }]}>
                  Read one page
                </Text>
              </View>
            </Animated.View>

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
              <Animated.Text
                style={[
                  styles.philoText,
                  { color: colors.onSurfaceVariant, opacity: philoOp[0] },
                ]}
              >
                You may be wondering whether reading just one page is even
                worth it...
              </Animated.Text>
            )}

            {philoPage === 1 && (
              <Animated.Text
                style={[
                  styles.philoText,
                  { color: colors.onSurface, opacity: philoOp[1] },
                ]}
              >
                But it's not about the{" "}
                <Text style={{ fontFamily: fonts.headlineExtraBold }}>
                  task
                </Text>
                , it's about the{" "}
                <Text style={{ fontFamily: fonts.headlineExtraBold }}>
                  action
                </Text>
              </Animated.Text>
            )}

            {philoPage === 2 && (
              <Animated.Text
                style={[
                  styles.philoText,
                  { color: colors.onSurface, opacity: philoOp[2] },
                ]}
              >
                Taking any initiative at all{" "}
                <Text style={{ fontFamily: fonts.headlineExtraBold }}>
                  signals
                </Text>{" "}
                the brain that you've done something to{" "}
                <Text style={{ fontFamily: fonts.headlineExtraBold }}>
                  improve
                </Text>{" "}
                yourself
              </Animated.Text>
            )}

            {philoPage === 3 && (
              <>
                <Animated.Text
                  style={[
                    styles.philoText,
                    { color: colors.onSurface, opacity: philoOp[3] },
                  ]}
                >
                  Over time, that becomes not a history of what you've done
                </Animated.Text>

                <Animated.Text
                  style={[
                    styles.philoText,
                    {
                      color: colors.onSurface,
                      opacity: philoOp[4],
                      marginTop: 16,
                    },
                  ]}
                >
                  But a proof of{" "}
                  <Text style={{ fontFamily: fonts.headlineExtraBold }}>
                    who you are
                  </Text>
                </Animated.Text>
              </>
            )}
          </View>

          {philoPage < 3 ? (
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
