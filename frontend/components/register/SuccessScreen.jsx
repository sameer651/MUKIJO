import Link from "next/link";
import styles from "../../app/styles/signup.module.css";

export default function SuccessScreen({ role }) {
    const isCustomRole = role && role !== "admin";

    return (
        <div className={styles.successContainer}>
            <div className={styles.successIcon}>OK</div>
            <h2 className={styles.successTitle}>Application Submitted</h2>
            <p className={styles.successText}>
                {isCustomRole ? (
                    `Club admin has to approve your application as a ${role}. You can log in only after the admin accepts it.`
                ) : (
                    "Your club has been registered successfully. You can now sign in to your dashboard to manage your club."
                )}
            </p>
            <Link href={isCustomRole ? "/login-member?registered=true" : "/login"} className={styles.submitButton} style={{ display: "inline-block", marginTop: "20px", textDecoration: "none", backgroundColor: "#1a73e8" }}>
                OK
            </Link>
        </div>
    );
}
