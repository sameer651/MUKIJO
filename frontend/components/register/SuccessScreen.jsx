import Link from "next/link";
import styles from "../../app/styles/signup.module.css";

export default function SuccessScreen({ role }) {
    const isCustomRole = role && role !== "admin";
    
    return (
        <div className={styles.successContainer}>
            <div className={styles.successIcon}>✓</div>
            <h2 className={styles.successTitle}>Registration Successful!</h2>
            <p className={styles.successText}>
                {isCustomRole ? (
                    `Your application as a ${role} has been submitted successfully. The club administrator will review and approve your registration shortly.`
                ) : (
                    "Your club has been registered successfully. You can now sign in to your dashboard to manage your club."
                )}
            </p>
            <Link href={isCustomRole ? "/" : "/login"} className={styles.submitButton} style={{ display: 'inline-block', marginTop: '20px', textDecoration: 'none', backgroundColor: '#1a73e8' }}>
                OK
            </Link>
        </div>
    );
}

