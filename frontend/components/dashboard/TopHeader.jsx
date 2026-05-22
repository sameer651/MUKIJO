import { Menu, X } from "lucide-react";

export default function TopHeader({ isMobileMenuOpen = false, onMenuToggle }) {
    return (
        <header className="top-header">
            <div className="top-header-brand">
                <button
                    type="button"
                    className="mobile-menu-button"
                    onClick={onMenuToggle}
                    aria-label={isMobileMenuOpen ? "Close navigation" : "Open navigation"}
                    aria-expanded={isMobileMenuOpen}
                >
                    {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                </button>
                <strong className="logo">Mukijo</strong>
            </div>
            <span className="topbar-tag">Advanced Club Management Platform</span>
        </header>
    );
}
