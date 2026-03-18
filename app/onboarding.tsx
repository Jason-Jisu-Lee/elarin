import { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { setOnboarded } from "../src/storage";
import { colors } from "../src/constants";

const { width } = Dimensions.get("window");

const PAGES = [
  {
    title: "The hardest part\nis starting.",
    body: "Not finishing. Not doing it perfectly.\nJust starting.\n\nElarin exists to make starting effortless.",
    visual: "spark",
  },
  {
    title: "Every choice\ncounts.",
    body: "Full workout, one pushup, or just snoozing the notification — all of it earns progress.\n\nThere are no failures here.\nOnly momentum.",
    visual: "ladder",
  },
  {
    title: "Start embarrassingly\nsmall.",
    body: "Set a goal. We'll build a ladder of progressively easier versions.\n\nWhen motivation is low, just step down.\nThe smallest action still counts.",
    visual: "demo",
  },
];

function LadderDemo() {
  const [activeStep, setActiveStep] = useState(0);
  const steps = ["10 pushups", "5 pushups", "1 pushup", "Stand up"];

  return (
    <View style={styles.ladderContainer}>
      {steps.map((step, i) => (
        <TouchableOpacity
          key={step}
          style={[
            styles.ladderStep,
            i === activeStep && styles.ladderStepActive,
            i < activeStep && styles.ladderStepDimmed,
          ]}
          onPress={() => setActiveStep(i)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.ladderText,
              i === activeStep && styles.ladderTextActive,
            ]}
          >
            {i === activeStep ? "→ " : "  "}
            {step}
          </Text>
          {i === activeStep && (
            <Text style={styles.ladderHint}>
              {i === steps.length - 1
                ? "✓ Minimum viable action"
                : "Tap next to step down"}
            </Text>
          )}
        </TouchableOpacity>
      ))}
      {activeStep < steps.length - 1 && (
        <TouchableOpacity
          style={styles.stepDownBtn}
          onPress={() =>
            setActiveStep((s) => Math.min(s + 1, steps.length - 1))
          }
        >
          <Text style={styles.stepDownBtnText}>⬇️ Make it easier</Text>
        </TouchableOpacity>
      )}
      {activeStep === steps.length - 1 && (
        <View style={styles.celebrateBox}>
          <Text style={styles.celebrateText}>
            🎉 All levels are celebrated equally!
          </Text>
        </View>
      )}
    </View>
  );
}

export default function Onboarding() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

  const handleNext = async () => {
    if (page < PAGES.length - 1) {
      scrollRef.current?.scrollTo({ x: width * (page + 1), animated: true });
      setPage(page + 1);
    } else {
      await setOnboarded(true);
      router.replace("/home");
    }
  };

  const handleScroll = (e: any) => {
    const newPage = Math.round(e.nativeEvent.contentOffset.x / width);
    if (newPage !== page) setPage(newPage);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        {PAGES.map((p, i) => (
          <View key={i} style={[styles.page, { width }]}>
            <View style={styles.visualArea}>
              {p.visual === "spark" && <Text style={styles.bigEmoji}>✨</Text>}
              {p.visual === "ladder" && <Text style={styles.bigEmoji}>📊</Text>}
              {p.visual === "demo" && <LadderDemo />}
            </View>
            <Text style={styles.title}>{p.title}</Text>
            <Text style={styles.body}>{p.body}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Pagination dots */}
      <View style={styles.dots}>
        {PAGES.map((_, i) => (
          <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
        ))}
      </View>

      <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
        <Text style={styles.nextBtnText}>
          {page === PAGES.length - 1 ? "Let's begin" : "Next"}
        </Text>
      </TouchableOpacity>

      {page < PAGES.length - 1 && (
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={async () => {
            await setOnboarded(true);
            router.replace("/home");
          }}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingBottom: 40,
  },
  page: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: "center",
  },
  visualArea: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  bigEmoji: {
    fontSize: 72,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 16,
    lineHeight: 36,
  },
  body: {
    fontSize: 16,
    color: colors.textMuted,
    lineHeight: 24,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceLight,
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: colors.accent,
    width: 24,
  },
  nextBtn: {
    marginHorizontal: 32,
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  nextBtnText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "600",
  },
  skipBtn: {
    alignItems: "center",
    marginTop: 12,
  },
  skipText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  // Ladder demo
  ladderContainer: {
    width: "100%",
    paddingHorizontal: 8,
  },
  ladderStep: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: colors.surface,
  },
  ladderStepActive: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.accent,
    borderWidth: 1,
  },
  ladderStepDimmed: {
    opacity: 0.4,
  },
  ladderText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "500",
  },
  ladderTextActive: {
    color: colors.accent,
    fontWeight: "700",
  },
  ladderHint: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
    marginLeft: 16,
  },
  stepDownBtn: {
    alignSelf: "center",
    marginTop: 8,
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  stepDownBtnText: {
    color: colors.white,
    fontWeight: "600",
    fontSize: 14,
  },
  celebrateBox: {
    alignSelf: "center",
    marginTop: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  celebrateText: {
    color: colors.success,
    fontWeight: "600",
    fontSize: 13,
  },
});
