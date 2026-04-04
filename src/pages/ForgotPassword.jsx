import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

function ForgotPassword() {
    const [step, setStep] = useState(1); // 1=email, 2=otp, 3=new password, 4=success
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const navigate = useNavigate();
    const otpRefs = useRef([]);

    useEffect(() => {
        if (step === 2 && otpRefs.current[0]) {
            otpRefs.current[0].focus();
        }
    }, [step]);

    // Step 1: Request OTP
    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.forgotPassword({ email });
            setSuccessMsg('A 6-digit OTP has been sent to your email.');
            setStep(2);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // OTP input handlers
    const handleOtpChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);
        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            setOtp(pasted.split(''));
            otpRefs.current[5]?.focus();
        }
    };

    // Step 2: Verify OTP
    const handleOtpSubmit = async (e) => {
        e.preventDefault();
        const otpString = otp.join('');
        if (otpString.length !== 6) {
            setError('Please enter the complete 6-digit OTP.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const data = await api.verifyOtp({ email, otp: otpString });
            setResetToken(data.resetToken);
            setSuccessMsg('');
            setStep(3);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Step 3: Reset Password
    const handleResetSubmit = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            await api.resetPassword({ resetToken, newPassword });
            setStep(4);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const stepTitles = ['Enter Email', 'Verify OTP', 'New Password', 'Done!'];

    return (
        <div className="auth-page">
            <div className="auth-card">
                {/* Step Indicator */}
                {step < 4 && (
                    <div className="fp-steps">
                        {[1, 2, 3].map((s) => (
                            <div key={s} className={`fp-step ${step >= s ? 'active' : ''} ${step > s ? 'completed' : ''}`}>
                                <div className="fp-step-circle">
                                    {step > s ? '✓' : s}
                                </div>
                                <span className="fp-step-label">{stepTitles[s - 1]}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Step 1: Email */}
                {step === 1 && (
                    <>
                        <div className="auth-header">
                            <h1>Forgot <span className="gradient-text">Password?</span></h1>
                            <p>Enter your registered email to receive a verification code</p>
                        </div>
                        <form className="auth-form" onSubmit={handleEmailSubmit}>
                            {error && <div className="auth-error">{error}</div>}
                            <div className="input-group">
                                <label htmlFor="fp-email">Email Address</label>
                                <input
                                    id="fp-email"
                                    type="email"
                                    className="input-field"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                                {loading ? (
                                    <>
                                        <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></div>
                                        Sending OTP...
                                    </>
                                ) : (
                                    '📧 Send OTP'
                                )}
                            </button>
                        </form>
                    </>
                )}

                {/* Step 2: OTP */}
                {step === 2 && (
                    <>
                        <div className="auth-header">
                            <h1>Enter <span className="gradient-text">OTP</span></h1>
                            <p>We sent a 6-digit code to <strong>{email}</strong></p>
                        </div>
                        <form className="auth-form" onSubmit={handleOtpSubmit}>
                            {successMsg && <div className="auth-success">{successMsg}</div>}
                            {error && <div className="auth-error">{error}</div>}
                            <div className="otp-input-group" onPaste={handleOtpPaste}>
                                {otp.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={(el) => (otpRefs.current[i] = el)}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        className="otp-box"
                                        value={digit}
                                        onChange={(e) => handleOtpChange(i, e.target.value)}
                                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                    />
                                ))}
                            </div>
                            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                                {loading ? (
                                    <>
                                        <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></div>
                                        Verifying...
                                    </>
                                ) : (
                                    '🔑 Verify OTP'
                                )}
                            </button>
                            <button
                                type="button"
                                className="btn btn-ghost fp-resend"
                                onClick={handleEmailSubmit}
                                disabled={loading}
                            >
                                Didn't receive the code? Resend OTP
                            </button>
                        </form>
                    </>
                )}

                {/* Step 3: New Password */}
                {step === 3 && (
                    <>
                        <div className="auth-header">
                            <h1>Reset <span className="gradient-text">Password</span></h1>
                            <p>Create a strong new password for your account</p>
                        </div>
                        <form className="auth-form" onSubmit={handleResetSubmit}>
                            {error && <div className="auth-error">{error}</div>}
                            <div className="input-group">
                                <label htmlFor="fp-new-password">New Password</label>
                                <input
                                    id="fp-new-password"
                                    type="password"
                                    className="input-field"
                                    placeholder="Min. 6 characters"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                            </div>
                            <div className="input-group">
                                <label htmlFor="fp-confirm-password">Confirm Password</label>
                                <input
                                    id="fp-confirm-password"
                                    type="password"
                                    className="input-field"
                                    placeholder="Re-enter your password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={6}
                                />
                            </div>
                            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                                {loading ? (
                                    <>
                                        <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></div>
                                        Resetting...
                                    </>
                                ) : (
                                    '🔒 Reset Password'
                                )}
                            </button>
                        </form>
                    </>
                )}

                {/* Step 4: Success */}
                {step === 4 && (
                    <div className="fp-success">
                        <div className="fp-success-icon">✅</div>
                        <h2>Password Reset <span className="gradient-text">Successful!</span></h2>
                        <p>Your password has been updated. You can now sign in with your new password.</p>
                        <Link to="/login" className="btn btn-primary btn-lg">
                            🔐 Go to Login
                        </Link>
                    </div>
                )}

                {step < 4 && (
                    <div className="auth-footer">
                        Remember your password? <Link to="/login">Sign In</Link>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ForgotPassword;
