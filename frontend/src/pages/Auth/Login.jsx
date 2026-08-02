import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Navbar } from "../../components/layout/Navbar";
import { ServiceErrorState } from "../../components/shared/ServiceErrorState";
import { useAuthStore } from "../../store/authStore";
import { useFarmStore } from "../../store/farmStore";
import { authService, getErrorMessage } from "../../api";
import { useToast } from "../../hooks/useToast";
import { homePathForUser, isAdminUser } from "../../lib/roles";
import {
	describeServiceError,
	isServiceOutageError,
} from "../../lib/serviceError";

const schema = z.object({
	email: z.string().email("Please enter a valid email"),
	password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Login() {
	const navigate = useNavigate();
	const login = useAuthStore((s) => s.login);
	const toast = useToast();
	const [loading, setLoading] = useState(false);
	const [formError, setFormError] = useState("");
	const [serviceError, setServiceError] = useState(null);
	const [lastCredentials, setLastCredentials] = useState(null);
	const storeSessionError = useAuthStore((s) => s.sessionError);
	const setStoreSessionError = useAuthStore((s) => s.setSessionError);

	const activeServiceError = serviceError || storeSessionError;

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm({ resolver: zodResolver(schema) });

	const attemptSignIn = async (data) => {
		setLoading(true);
		setFormError("");
		setServiceError(null);
		setStoreSessionError(null);
		setLastCredentials(data);
		try {
			const { user, token } = await authService.login(data);
			useFarmStore.getState().resetFarmData();
			login(user, token);

			if (!isAdminUser(user)) {
				const savedLoc = user.location?.label
					? { ...user.location, source: user.location.source || "saved" }
					: user.region
						? {
								id: `user-${user.id}`,
								label: user.region,
								fullLabel: user.district || user.region,
								country: user.countryCode || "GB",
								source: "saved",
							}
						: null;
				if (savedLoc?.label) {
					const patch = { location: savedLoc, region: savedLoc.label };
					if (user.farmSize && Number(user.farmSize) > 0) {
						patch.area = Number(user.farmSize);
					}
					useFarmStore.getState().updateSoilData(patch);
				}
			}

			toast.success(
				isAdminUser(user) ? "Welcome, admin" : "Welcome back!",
				isAdminUser(user)
					? "Opening the admin dashboard."
					: "Good to see you again.",
			);
			navigate(homePathForUser(user));
		} catch (err) {
			const info = describeServiceError(err, { action: "sign you in" });
			if (isServiceOutageError(info)) {
				setServiceError(info);
				toast.error(
					info.title,
					`Contact ${info.contactEmail || "support"} for help.`,
				);
			} else {
				const message = getErrorMessage(err, info.description);
				setFormError(message);
				toast.error("Sign in failed", message);
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-dvh bg-bg dark:bg-bg-dark">
			<Navbar />
			<div className="flex items-center justify-center px-5 py-12">
				<AnimatePresence mode="wait">
					{activeServiceError ? (
						<ServiceErrorState
							key="service-error"
							error={activeServiceError}
							onRecovered={() => {
								setServiceError(null);
								setStoreSessionError(null);
								if (lastCredentials) {
									attemptSignIn(lastCredentials);
								} else {
									toast.info("Connection restored", "You can sign in now.");
								}
							}}
							onRetry={() => {
								setServiceError(null);
								setStoreSessionError(null);
								if (lastCredentials) attemptSignIn(lastCredentials);
							}}
							onBack={() => {
								setServiceError(null);
								setStoreSessionError(null);
							}}
							backLabel="Back to sign in"
						/>
					) : (
						<motion.div
							key="login-form"
							initial={{ opacity: 0, y: 12 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -8 }}
							className="w-full max-w-[400px]"
						>
							<Card variant="elevated" className="p-6">
								<h1 className="font-display text-2xl font-semibold text-text-primary dark:text-text-dark-primary mb-1">
									Welcome back
								</h1>
								<p className="text-sm text-text-secondary dark:text-text-dark-secondary mb-6">
									Sign in to your crop plan
								</p>

								<form
									onSubmit={handleSubmit(attemptSignIn)}
									className="space-y-4"
								>
									<Input
										label="Email"
										type="email"
										icon={Mail}
										error={errors.email?.message}
										{...register("email", { onChange: () => setFormError("") })}
									/>
									<Input
										label="Password"
										type="password"
										icon={Lock}
										error={errors.password?.message}
										{...register("password", {
											onChange: () => setFormError(""),
										})}
									/>
									<div className="text-right">
										<Link
											to="/forgot-password"
											className="text-sm text-primary hover:underline inline-flex items-center min-h-[48px]"
										>
											Forgot password?
										</Link>
									</div>
									<Button type="submit" loading={loading} className="w-full">
										Sign in
									</Button>
								</form>

								{formError && (
									<div
										className="mt-4 p-3 rounded-lg border border-error/30 bg-error/5 text-sm"
										role="alert"
									>
										<p className="text-error">{formError}</p>
										{/deactivated|contact.+admin|reactivat/i.test(
											formError,
										) && (
											<p className="mt-2 text-text-secondary dark:text-text-dark-secondary">
												Ask your FarmSense admin to reactivate your account,
												then try signing in again.
											</p>
										)}
										{/no account|register/i.test(formError) && (
											<Link
												to="/register"
												className="inline-block mt-2 text-primary font-medium hover:underline"
											>
												Create an account
											</Link>
										)}
										{/incorrect password|forgot password/i.test(formError) && (
											<Link
												to="/forgot-password"
												className="inline-block mt-2 text-primary font-medium hover:underline"
											>
												Forgot password?
											</Link>
										)}
									</div>
								)}

								<p className="text-center text-sm text-text-muted dark:text-text-dark-muted mt-6">
									Prototype sign-in for the FarmSense AI dissertation project
								</p>
								<p className="text-center text-sm mt-4">
									<span className="text-text-secondary dark:text-text-dark-secondary">
										New here?{" "}
									</span>
									<Link
										to="/register"
										className="text-primary font-medium hover:underline"
									>
										Create account
									</Link>
								</p>
							</Card>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
}
