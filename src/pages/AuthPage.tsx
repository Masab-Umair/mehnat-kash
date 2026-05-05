import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowRight, Sparkles, User, Wrench, ShieldCheck, ArrowLeft, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

type AuthStep = "email" | "otp" | "profile" | "complete";
type UserRole = "customer" | "professional";

const AuthPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [step, setStep] = useState<AuthStep>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_type")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (profile) {
          navigate(profile.user_type === "professional" ? "/pro/dashboard" : "/");
        }
      }
    };
    checkSession();
  }, [navigate]);

  const handleEmailSubmit = async () => {
    if (!email || !email.includes("@")) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
      if (error) throw error;
      toast({ title: t("auth.codeSent"), description: t("auth.checkInbox", { email }) });
      setStep("otp");
    } catch (err: any) {
      toast({ title: t("auth.error"), description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOtp = [...otp];
      newOtp[index] = value;
      setOtp(newOtp);

      if (value && index < 5) {
        document.getElementById(`otp-${index + 1}`)?.focus();
      }

      if (newOtp.every((d) => d !== "") && index === 5) {
        verifyOtp(newOtp.join(""));
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const verifyOtp = async (token: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token,
        type: "email",
      });
      if (error) throw error;

      if (data.user) {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id, user_type")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (existingProfile) {
          navigate(existingProfile.user_type === "professional" ? "/pro/dashboard" : "/");
        } else {
          setStep("profile");
        }
      }
    } catch (err: any) {
      toast({ title: t("auth.invalidCode"), description: err.message, variant: "destructive" });
      setOtp(["", "", "", "", "", ""]);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (role: UserRole) => {
    setSelectedRole(role);
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("profiles").insert({
        user_id: user.id,
        full_name: fullName.trim() || null,
        phone: phone.trim() || "",
        user_type: role,
      });
      if (error) throw error;
      setStep("complete");
    } catch (err: any) {
      toast({ title: t("auth.error"), description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
      if (error) throw error;
      toast({ title: t("auth.codeResent"), description: t("auth.checkInbox", { email }) });
    } catch (err: any) {
      toast({ title: t("auth.error"), description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const slideVariants = {
    enter: { x: 50, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -50, opacity: 0 },
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-4 sm:p-6 safe-top flex items-center justify-between">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl gradient-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 sm:w-7 sm:h-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gradient">MehnatKash</h1>
            <p className="text-xs text-muted-foreground">Find trusted workers</p>
          </div>
        </motion.div>
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate("/")}
          className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </motion.button>
      </header>

      <main className="flex-1 container px-4 sm:px-6 py-6 sm:py-8">
        <AnimatePresence mode="wait">
          {step === "email" && (
            <motion.div key="email" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="space-y-6 sm:space-y-8">
              <div className="flex justify-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }} className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
                </motion.div>
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">{t("auth.enterEmail")}</h2>
                <p className="text-muted-foreground">{t("auth.sendCode")}</p>
              </div>
              <div className="space-y-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
                  placeholder={t("auth.emailPlaceholder")}
                  className="w-full h-14 sm:h-16 px-5 sm:px-6 text-base sm:text-lg font-medium bg-muted rounded-xl sm:rounded-2xl border-2 border-transparent focus:border-primary focus:outline-none transition-colors"
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleEmailSubmit}
                  disabled={!email.includes("@") || loading}
                  className="w-full h-14 sm:h-16 gradient-primary text-primary-foreground rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed haptic shadow-glow"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (<>{t("auth.continue")}<ArrowRight className="w-5 h-5" /></>)}
                </motion.button>
              </div>
            </motion.div>
          )}

          {step === "otp" && (
            <motion.div key="otp" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="space-y-8">
              <div className="flex justify-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }} className="w-24 h-24 rounded-full bg-success/10 flex items-center justify-center">
                  <ShieldCheck className="w-12 h-12 text-success" />
                </motion.div>
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-foreground">{t("auth.enterCode")}</h2>
                <p className="text-muted-foreground">{t("auth.sentTo", { email })}</p>
              </div>
              <div className="flex justify-center gap-3">
                {otp.map((digit, index) => (
                  <motion.input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="w-12 h-16 text-center text-2xl font-bold bg-muted rounded-2xl border-2 border-transparent focus:border-primary focus:outline-none transition-colors"
                  />
                ))}
              </div>
              {loading && (
                <div className="flex justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}
              <div className="text-center space-y-3">
                <button onClick={handleResendCode} disabled={loading} className="text-sm text-primary font-medium disabled:opacity-50">
                  {t("auth.resendCode")}
                </button>
                <br />
                <button onClick={() => { setStep("email"); setOtp(["", "", "", "", "", ""]); }} className="text-sm text-muted-foreground font-medium flex items-center gap-1 mx-auto">
                  <ArrowLeft className="w-3 h-3" />
                  {t("auth.changeEmail")}
                </button>
              </div>
            </motion.div>
          )}

          {step === "profile" && (
            <motion.div key="profile" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-foreground">{t("auth.welcome")}</h2>
                <p className="text-muted-foreground">{t("auth.tellAboutYourself")}</p>
              </div>
              <div className="space-y-4">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t("auth.yourName")}
                  className="w-full h-14 px-6 text-base font-medium bg-muted rounded-2xl border-2 border-transparent focus:border-primary focus:outline-none transition-colors"
                />
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-muted-foreground">
                    <span className="text-base font-semibold">+92</span>
                    <div className="w-px h-6 bg-border" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder={t("auth.phonePlaceholder")}
                    className="w-full h-14 pl-20 pr-4 text-base font-medium bg-muted rounded-2xl border-2 border-transparent focus:border-primary focus:outline-none transition-colors"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground text-center">{t("auth.iAmA")}</p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleProfileSubmit("customer")}
                  disabled={loading}
                  className="w-full p-5 bg-card rounded-3xl border-2 border-border hover:border-primary transition-colors text-left haptic shadow-card disabled:opacity-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <User className="w-7 h-7 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-foreground">{t("auth.iNeedHelp")}</h3>
                      <p className="text-sm text-muted-foreground">{t("auth.findWorkersHome")}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleProfileSubmit("professional")}
                  disabled={loading}
                  className="w-full p-5 bg-card rounded-3xl border-2 border-border hover:border-secondary transition-colors text-left haptic shadow-card disabled:opacity-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center">
                      <Wrench className="w-7 h-7 text-secondary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-foreground">{t("auth.iAmWorker")}</h3>
                      <p className="text-sm text-muted-foreground">{t("auth.getJobsEarn")}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </motion.button>
              </div>
            </motion.div>
          )}

          {step === "complete" && (
            <motion.div key="complete" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className="w-32 h-32 rounded-full bg-success flex items-center justify-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4 }}>
                  <ShieldCheck className="w-16 h-16 text-success-foreground" />
                </motion.div>
              </motion.div>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-foreground">{t("auth.allSet")}</h2>
                <p className="text-muted-foreground">
                  {selectedRole === "customer" ? t("auth.findHelpHome") : t("auth.startGettingJobs")}
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(selectedRole === "customer" ? "/" : "/pro/onboarding")}
                className="px-8 py-4 gradient-primary text-primary-foreground rounded-2xl font-bold text-lg haptic shadow-glow"
              >
                {selectedRole === "customer" ? t("auth.startSearching") : t("auth.setUpProfile")}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="p-6 safe-bottom">
        <div className="flex justify-center gap-2">
          {["email", "otp", "profile", "complete"].map((s, index) => (
            <motion.div
              key={s}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 * index }}
              className={`h-2 rounded-full transition-all ${step === s ? "bg-primary w-6" : "bg-muted w-2"}`}
            />
          ))}
        </div>
      </footer>
    </div>
  );
};

export default AuthPage;
