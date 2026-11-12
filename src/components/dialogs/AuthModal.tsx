import React, { useState } from 'react';
import {
  detectContactType,
  isSupabaseConfigured,
  loginUserAccount,
  registerUserAccount,
} from '../../services/supabase/supabaseService';
import { useAuthStore } from '../../stores/useAuthStore';
import { useToastStore } from '../../stores/useToastStore';
import { useI18n } from '../../i18n';
import {
  X,
  UserCheck,
  UserPlus,
  Mail,
  Phone,
  AtSign,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Cloud,
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { authModalOpen, setAuthModalOpen, setCurrentUser, setCloudConfigModalOpen } =
    useAuthStore();
  const { addToast } = useToastStore();
  const { lang } = useI18n();
  const isVi = lang === 'vi';

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState(''); // Login: username, gmail, or phone
  const [username, setUsername] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!authModalOpen) return null;

  const detectedContact = detectContactType(emailOrPhone);
  const supabaseReady = isSupabaseConfigured();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        if (!identifier.trim() || !password) {
          throw new Error(
            isVi
              ? 'Vui lòng nhập Username / Gmail / SĐT và mật khẩu.'
              : 'Please enter your Username / Email / Phone and password.'
          );
        }
        const profile = await loginUserAccount({
          identifier,
          password,
        });
        setCurrentUser(profile);
        setAuthModalOpen(false);
        addToast(
          isVi
            ? `Chào mừng trở lại, ${profile.displayName} (@${profile.username})!`
            : `Welcome back, ${profile.displayName} (@${profile.username})!`,
          'success'
        );
      } else {
        const profile = await registerUserAccount({
          username,
          emailOrPhone,
          displayName,
          password,
        });
        setCurrentUser(profile);
        setAuthModalOpen(false);
        addToast(
          isVi
            ? `Đã tạo tài khoản @${profile.username} thành công!`
            : `Account @${profile.username} created successfully!`,
          'success'
        );
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-charcoal/70 backdrop-blur-xs p-4 overflow-y-auto text-charcoal">
      <div className="bg-ivory text-charcoal border border-beige rounded-2xl shadow-book max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-cream/80 border-b border-beige flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-charcoal text-gold flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-semibold text-charcoal leading-tight">
                {mode === 'login'
                  ? isVi
                    ? 'Đăng Nhập Tài Khoản'
                    : 'Sign In to Studio'
                  : isVi
                  ? 'Đăng Ký Tài Khoản Mới'
                  : 'Create Studio Account'}
              </h2>
              <p className="text-[11px] text-charcoal/65">
                {isVi
                  ? 'Phân quyền chủ sở hữu Album & đồng bộ dữ liệu đám mây'
                  : 'Album ownership permissions & cloud synchronization'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAuthModalOpen(false)}
            className="p-1.5 rounded-full text-charcoal/60 hover:text-charcoal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 p-1.5 m-5 mb-0 rounded-xl bg-cream border border-beige text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mode === 'login'
                ? 'bg-charcoal text-ivory shadow-xs'
                : 'text-charcoal/70 hover:text-charcoal'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>{isVi ? 'Đăng nhập' : 'Sign In'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg(null);
            }}
            className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mode === 'register'
                ? 'bg-charcoal text-ivory shadow-xs'
                : 'text-charcoal/70 hover:text-charcoal'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{isVi ? 'Đăng ký' : 'Register'}</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-medium leading-relaxed">
              {errorMsg}
            </div>
          )}

          {mode === 'login' ? (
            <div>
              <label className="block font-semibold text-charcoal/80 mb-1.5">
                {isVi
                  ? 'Username, Gmail hoặc Số điện thoại *'
                  : 'Username, Gmail, or Phone Number *'}
              </label>
              <div className="relative">
                <AtSign className="w-4 h-4 text-terracotta absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={
                    isVi
                      ? 'Nhập username, email@gmail.com hoặc 0912345678'
                      : 'username, email@gmail.com, or phone'
                  }
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-beige focus:border-terracotta outline-none text-charcoal text-sm"
                />
              </div>
            </div>
          ) : (
            <>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-charcoal/80">
                    {isVi ? 'Gmail hoặc Số điện thoại *' : 'Gmail or Phone Number *'}
                  </label>
                  {detectedContact === 'email' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                      <Mail className="w-3 h-3" /> Email hợp lệ
                    </span>
                  )}
                  {detectedContact === 'phone' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                      <Phone className="w-3 h-3" /> Số điện thoại hợp lệ
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Mail className="w-4 h-4 text-terracotta absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    placeholder={isVi ? 'Ví dụ: tenban@gmail.com hoặc 0901234567' : 'email@gmail.com or 0901234567'}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-beige focus:border-terracotta outline-none text-charcoal text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-charcoal/80 mb-1.5">
                  {isVi ? 'Username (Tên đăng nhập) *' : 'Username *'}
                </label>
                <div className="relative">
                  <AtSign className="w-4 h-4 text-terracotta absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    placeholder={isVi ? 'Ví dụ: nhuha2026' : 'e.g. nhuha2026'}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-beige focus:border-terracotta outline-none text-charcoal text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-charcoal/80 mb-1.5">
                  {isVi ? 'Tên hiển thị / Bút danh tác giả' : 'Display / Author Name'}
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={isVi ? 'Ví dụ: Nguyễn Võ Như Hạ' : 'Your full name'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-beige focus:border-terracotta outline-none text-charcoal text-sm"
                />
              </div>
            </>
          )}

          <div>
            <label className="block font-semibold text-charcoal/80 mb-1.5">
              {isVi ? 'Mật khẩu (Password) *' : 'Password *'}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-terracotta absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white border border-beige focus:border-terracotta outline-none text-charcoal text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal/50 hover:text-charcoal"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-terracotta hover:bg-charcoal text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === 'login' ? (
              <UserCheck className="w-4 h-4" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            <span>
              {mode === 'login'
                ? isVi
                  ? 'Đăng nhập vào Studio'
                  : 'Sign In'
                : isVi
                ? 'Tạo tài khoản & Bắt đầu'
                : 'Create Account'}
            </span>
          </button>

          {/* Supabase Cloud Connection Status Bar */}
          <div className="pt-2 border-t border-beige flex items-center justify-between text-[11px] text-charcoal/65">
            <span className="flex items-center gap-1.5">
              <Cloud
                className={`w-3.5 h-3.5 ${
                  supabaseReady ? 'text-emerald-600' : 'text-terracotta'
                }`}
              />
              {supabaseReady
                ? isVi
                  ? 'Đã kết nối cơ sở dữ liệu Supabase Cloud'
                  : 'Connected to Supabase Cloud DB'
                : isVi
                ? 'Chế độ Cloud tự động (Chưa gắn Supabase riêng)'
                : 'Auto Cloud Mode (Custom Supabase not set)'}
            </span>
            <button
              type="button"
              onClick={() => {
                setAuthModalOpen(false);
                setCloudConfigModalOpen(true);
              }}
              className="text-terracotta font-semibold hover:underline"
            >
              {isVi ? 'Cấu hình Supabase' : 'Configure Supabase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
