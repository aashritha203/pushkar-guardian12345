import { useState } from "react";
import { Landmark, User, Lock, Chrome, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { ref, set } from "firebase/database";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendEmailVerification, signOut, sendPasswordResetEmail, signInWithCustomToken } from "firebase/auth";
import { db, auth } from "@/lib/firebase";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [isSignUp, setIsSignUp] = useState(false);
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }
    
    try {
      let userCredential;
      if (isSignUp) {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        try {
          await sendEmailVerification(userCredential.user);
          console.log("✅ Verification email sent successfully");
        } catch (verifyErr: any) {
          console.error("❌ Verification email FAILED:", verifyErr.code, verifyErr.message);
        }
        
        // TEMPORARILY DISABLED for demo:
        // await signOut(auth); 
        // setError("");
        // setSuccessMessage("Account created! Please check your email to verify your account before logging in.");
        // return; // stop here

        // Instead of stopping, we just let them log in instantly:
        setSuccessMessage("Account created! You are now logged in.");
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Admin bypasses verification check entirely
        if (email !== "admin@test.com" && email !== "aashritha203@gmail.com") {
          // TEMPORARILY DISABLED for demo:
          /*
          await user.reload(); // refresh verification status
          if (!user.emailVerified) {
            await signOut(auth);
            setError("Please verify your email before logging in. Check your inbox for the verification link.");
            return;
          }
          */
        }
      }

      if (rememberMe) {
        localStorage.setItem("loggedIn", "true");
      } else {
        localStorage.removeItem("loggedIn");
      }
      
      // Optional: still log to Realtime DB for their analytics
      const userId = auth.currentUser?.uid || `user-${Date.now()}`;
      const timestamp = Math.floor(Date.now() / 1000);
      const date = new Date();
      set(ref(db, `users/${userId}`), {
        email: email,
        username: email.split('@')[0],
        loginTime: date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        loginDate: date.toLocaleDateString('en-GB').replace(/\//g, '-'),
        loginTimestamp: timestamp,
      }).catch(console.error);

      // Check if admin
      if (userCredential.user.email === "admin@test.com" || userCredential.user.email === "aashritha203@gmail.com") {
        navigate({ to: "/operator" });
      } else {
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/operation-not-allowed") {
        setError("Email/Password login is DISABLED in your Firebase Project. Go to Firebase Console -> Authentication -> Sign-in method -> Enable 'Email/Password'.");
      } else if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
        setError("Invalid email or password. Are you sure you created this account?");
      } else if (err.code === "auth/email-already-in-use") {
        setError("An account already exists with this email. Try logging in instead.");
      } else {
        setError(`Firebase Error: ${err.message || err.code || "Unknown error"}`);
      }
    }
  };

  const BACKEND_URL = "http://localhost:5000";

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    setError("");
    setSuccessMessage("");
    try {
      const res = await fetch(`${BACKEND_URL}/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setOtpSent(true);
        setSuccessMessage("OTP sent! Check your email.");
      } else {
        setError(data.message || "Failed to send OTP.");
      }
    } catch (err: any) {
      setError("Network error. Make sure backend is running.");
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !otp.trim()) {
      setError("Please enter both email and OTP.");
      return;
    }
    setError("");
    setSuccessMessage("");
    try {
      const res = await fetch(`${BACKEND_URL}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (data.success && data.token) {
        // Sign in with Firebase custom token
        const userCredential = await signInWithCustomToken(auth, data.token);
        
        if (rememberMe) {
          localStorage.setItem("loggedIn", "true");
        } else {
          localStorage.removeItem("loggedIn");
        }

        // Optional log
        const userId = userCredential.user.uid;
        const timestamp = Math.floor(Date.now() / 1000);
        const date = new Date();
        set(ref(db, `users/${userId}`), {
          email: email,
          username: email.split('@')[0],
          loginTime: date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
          loginDate: date.toLocaleDateString('en-GB').replace(/\//g, '-'),
          loginTimestamp: timestamp,
        }).catch(console.error);

        if (userCredential.user.email === "admin@test.com" || userCredential.user.email === "aashritha203@gmail.com") {
          navigate({ to: "/operator" });
        } else {
          navigate({ to: "/dashboard" });
        }
      } else {
        setError(data.message || "Invalid OTP.");
      }
    } catch (err: any) {
      setError("Network error. Make sure backend is running.");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // Force the account selection popup to appear every time
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      
      if (rememberMe) {
        localStorage.setItem("loggedIn", "true");
      }

      // Write to Firebase
      const uid = result.user.uid;
      const timestamp = Math.floor(Date.now() / 1000);
      set(ref(db, `users/${uid}`), {
        uid: uid,
        displayName: result.user.displayName || "Google User",
        email: result.user.email || "user@gmail.com",
        photoURL: result.user.photoURL || "https://lh3.googleusercontent.com/a/default-user",
        loginTimestamp: timestamp
      }).catch(console.error);

      if (result.user.email === "admin@test.com" || result.user.email === "aashritha203@gmail.com") {
        navigate({ to: "/operator" });
      } else {
        navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/operation-not-allowed") {
        setError("Google Login is DISABLED in your Firebase Project. Go to Firebase Console -> Authentication -> Sign-in method -> Enable 'Google'.");
      } else {
        setError(`Google Login Error: ${err.message || err.code || "Unknown error"}`);
      }
    }
  };

  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address first, then click Forgot Password.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setError("");
      setSuccessMessage("Password reset link sent! Please check your email.");
    } catch (err: any) {
      setError(err.message || "Failed to send password reset email.");
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: `linear-gradient(to bottom right, rgba(30, 27, 75, 0.9), rgba(49, 46, 129, 0.9)), url('https://images.unsplash.com/photo-1595815771614-ade9d652a65d?q=80&w=2000&auto=format&fit=crop')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="relative z-10 w-full max-w-md p-8 bg-white rounded-2xl shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
            <Landmark className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center">Welcome to Godavari Pushkaralu</h1>
          <p className="text-sm text-indigo-600 font-medium mt-1 text-center">Smart Pilgrim Crowd Management</p>
          <p className="text-sm text-gray-500 mt-2">Login to continue</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg text-center">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-600 text-sm rounded-lg text-center">
            {successMessage}
          </div>
        )}

        <div className="flex mb-6 space-x-4 border-b border-gray-200">
          <button
            type="button"
            onClick={() => { setIsOtpMode(false); setError(""); setSuccessMessage(""); }}
            className={`pb-2 px-1 text-sm font-medium transition-colors ${
              !isOtpMode ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Password Login
          </button>
          <button
            type="button"
            onClick={() => { setIsOtpMode(true); setError(""); setSuccessMessage(""); }}
            className={`pb-2 px-1 text-sm font-medium transition-colors ${
              isOtpMode ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Email OTP Login
          </button>
        </div>

        {!isOtpMode ? (
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Email / Username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 placeholder-gray-400"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 placeholder-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                {showPassword ? (
                  <EyeOff size={18} color="#999" />
                ) : (
                  <Eye size={18} color="#999" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                />
                Remember me
              </label>
              <a href="#" onClick={handleForgotPassword} className="text-indigo-600 hover:text-indigo-500 font-medium">
                Forgot Password?
              </a>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-medium transition-colors"
            >
              {isSignUp ? "Create Account" : "Login"}
            </button>
          </form>
        ) : (
          <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={otpSent}
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 placeholder-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>

            {otpSent && (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900 placeholder-gray-400"
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-medium transition-colors"
            >
              {otpSent ? "Verify & Login" : "Send OTP"}
            </button>
          </form>
        )}

        {!isOtpMode && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
                setSuccessMessage("");
              }}
              className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
            >
              {isSignUp ? "Already have an account? Login" : "Don't have an account? Sign Up"}
            </button>
          </div>
        )}

        <div className="mt-6 flex items-center justify-center">
          <div className="w-full border-t border-gray-300"></div>
          <div className="px-4 text-sm text-gray-500 bg-white">or</div>
          <div className="w-full border-t border-gray-300"></div>
        </div>

        <button
          onClick={handleGoogleLogin}
          type="button"
          className="mt-6 w-full flex items-center justify-center py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-medium transition-colors"
        >
          <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>

        <div className="mt-8 flex items-center justify-center text-sm text-gray-500 font-medium">
          <Lock className="w-4 h-4 mr-1.5" />
          Secure Login
        </div>
      </div>
    </div>
  );
}
