import React, { useState, useEffect } from "react";
import {
  X,
  Mail,
  Lock,
  User,
  Phone,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { AuthRateLimitError } from "@corvax/shared";

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, login, register, isGuest } = useAuth();
  const [tab, setTab] = useState<"login" | "register">("login");

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Status & Rate Limit states
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown > 0) return;

    setError(null);
    setLoading(true);

    try {
      if (tab === "login") {
        if (!email.trim() || !password.trim()) {
          throw new Error("Заполните email и пароль");
        }
        await login({ email: email.trim(), password });
      } else {
        if (!name.trim()) {
          throw new Error("Укажите ваше имя");
        }
        if (!email.trim() || !password.trim()) {
          throw new Error("Укажите email и пароль");
        }
        if (password.length < 6) {
          throw new Error("Пароль должен содержать не менее 6 символов");
        }
        await register({
          fullName: name.trim(),
          email: email.trim(),
          password,
          phone: phone.trim() || undefined,
        });
      }
      // Reset form
      setEmail("");
      setPassword("");
      setName("");
      setPhone("");
    } catch (err: unknown) {
      if (err instanceof AuthRateLimitError || (err as any)?.status === 429) {
        setCooldown(60);
        setError("Превышен лимит попыток входа (максимум 5 в минуту). Пожалуйста, подождите 60 секунд.");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Произошла непредвиденная ошибка");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={closeAuthModal}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md bg-surface dark:bg-[#1a1628] border border-surface-border dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden text-content-primary transition-all animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient branding */}
        <div className="relative bg-gradient-to-r from-[#581c87] via-[#6b21a8] to-[#7e22ce] text-white p-6 pb-5">
          <button
            type="button"
            onClick={closeAuthModal}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/90 hover:text-white transition-colors"
            aria-label="Закрыть"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 border border-white/30 flex items-center justify-center text-white font-black text-sm">
              О!
            </div>
            <span className="text-base font-bold tracking-tight">О!дин запрос</span>
          </div>

          <h3 className="text-xl font-bold">
            {tab === "login" ? "Вход в аккаунт" : "Регистрация путешественника"}
          </h3>
          <p className="text-xs text-white/80 mt-1">
            {tab === "login"
              ? "Войдите для доступа к сохранённым маршрутам и бронированиям"
              : "Создайте аккаунт для персонализированных рекомендаций и скидок"}
          </p>

          {isGuest && (
            <div className="mt-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 border border-white/20 text-[11px] text-white/95">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>Текущие диалоги и туры автоматически сохранятся в вашем профиле</span>
            </div>
          )}
        </div>

        {/* Tab switchers */}
        <div className="flex border-b border-surface-border dark:border-white/10 bg-surface-muted/50 dark:bg-black/20">
          <button
            type="button"
            onClick={() => {
              setTab("login");
              setError(null);
            }}
            className={`flex-1 py-3 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors border-b-2 ${
              tab === "login"
                ? "border-[#581c87] text-[#581c87] dark:text-purple-400 bg-surface dark:bg-[#1a1628]"
                : "border-transparent text-content-secondary hover:text-content-primary"
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Вход</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("register");
              setError(null);
            }}
            className={`flex-1 py-3 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors border-b-2 ${
              tab === "register"
                ? "border-[#581c87] text-[#581c87] dark:text-purple-400 bg-surface dark:bg-[#1a1628]"
                : "border-transparent text-content-secondary hover:text-content-primary"
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Регистрация</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {cooldown > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
              <Clock className="w-4 h-4 shrink-0 animate-pulse" />
              <span>Повторная попытка будет доступна через {cooldown} сек.</span>
            </div>
          )}

          {tab === "register" && (
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">
                Имя и фамилия
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-content-muted absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="Константин Константинопольский"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-surface-border dark:border-white/10 focus:border-[#581c87] dark:focus:border-purple-400 focus:outline-none bg-surface-muted/50 dark:bg-white/5 text-content-primary"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">
              Электронная почта
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-content-muted absolute left-3 top-2.5" />
              <input
                type="email"
                required
                placeholder="traveler@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-surface-border dark:border-white/10 focus:border-[#581c87] dark:focus:border-purple-400 focus:outline-none bg-surface-muted/50 dark:bg-white/5 text-content-primary"
              />
            </div>
          </div>

          {tab === "register" && (
            <div>
              <label className="block text-xs font-medium text-content-secondary mb-1">
                Телефон (необязательно)
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-content-muted absolute left-3 top-2.5" />
                <input
                  type="tel"
                  placeholder="+7 (999) 000-00-00"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-surface-border dark:border-white/10 focus:border-[#581c87] dark:focus:border-purple-400 focus:outline-none bg-surface-muted/50 dark:bg-white/5 text-content-primary"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-content-secondary mb-1">
              Пароль
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-content-muted absolute left-3 top-2.5" />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder={tab === "register" ? "Минимум 6 символов" : "••••••••"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2 text-xs sm:text-sm rounded-xl border border-surface-border dark:border-white/10 focus:border-[#581c87] dark:focus:border-purple-400 focus:outline-none bg-surface-muted/50 dark:bg-white/5 text-content-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-2.5 text-content-muted hover:text-content-primary"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || cooldown > 0}
            className="w-full py-2.5 px-4 mt-2 rounded-xl bg-gradient-to-r from-[#581c87] to-[#7e22ce] hover:from-[#4a1674] hover:to-[#6b21a8] text-white text-xs sm:text-sm font-bold shadow-md shadow-purple-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : cooldown > 0 ? (
              <span>Подождите {cooldown} сек...</span>
            ) : tab === "login" ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Войти</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Зарегистрироваться</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
