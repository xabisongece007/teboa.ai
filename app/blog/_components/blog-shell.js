import Link from "next/link";
import styles from "../blog.module.css";

export default function BlogShell({ eyebrow, title, description, children }) {
  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navLinks}>
          <Link href="/about">About</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/docs">Docs</Link>
          <Link href="/help">Help</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/contact">Contact</Link>
          <Link className={styles.navCta} href="https://app.teboatech.com">
            Get Started
          </Link>
        </div>
      </nav>

      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroLogoWrap}>
            <Link href="/" aria-label="Go to homepage">
              <img
                src="/assets/images/teboa-hero-logo.svg"
                alt="Teboa logo"
                className={styles.heroLogo}
                width="200"
                height="200"
              />
            </Link>
          </div>
          {eyebrow ? <span className={styles.eyebrow}>{eyebrow}</span> : null}
          <h1>{title}</h1>
          {description ? <p>{description}</p> : null}
        </div>
      </header>

      <main>{children}</main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="footer-brand-name">Teboa</div>
            <p>
              TeboaTech builds Teboa. An AI-powered eCommerce operating system that helps
              store owners automate operations, manage customers, and grow revenue without
              burning out.
            </p>
            <p className="footer-company">TeboaTech</p>
            <div className="footer-socials" aria-label="Teboa social media">
              <a
                className="footer-social-link"
                href="https://www.linkedin.com/company/teboatech"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visit Teboa on LinkedIn"
              >
                <img
                  src="https://firebasestorage.googleapis.com/v0/b/teboatech-mvp.firebasestorage.app/o/linkedin.svg?alt=media&token=e8e58497-be50-4fc9-9fb1-40106f21d2bf"
                  alt="TeboaTech on LinkedIn"
                />
              </a>
              <a
                className="footer-social-link"
                href="https://www.facebook.com/teboatech"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visit Teboa on Facebook"
              >
                <img
                  src="https://firebasestorage.googleapis.com/v0/b/teboatech-mvp.firebasestorage.app/o/facebook.svg?alt=media&token=4e9ba464-d7f7-4405-b270-54758dbdabcd"
                  alt="TeboaTech on Facebook"
                />
              </a>
            </div>
          </div>
          <div className="footer-col">
            <h5>Quick Links</h5>
            <ul>
              <li>
                <Link href="/about">About Teboa</Link>
              </li>
              <li>
                <Link href="/docs">Documentation</Link>
              </li>
              <li>
                <Link href="/blog">Blog</Link>
              </li>
              <li>
                <Link href="/help">Help Center</Link>
              </li>
              <li>
                <Link href="/pricing">Pricing</Link>
              </li>
              <li>
                <Link href="/contact">Contact Us</Link>
              </li>
              <li>
                <a href="https://app.teboatech.com">Login</a>
              </li>
            </ul>
          </div>
          <div className="footer-col">
            <h5>Resources</h5>
            <ul>
              <li>
                <Link href="/shopify-automation">Shopify Automation Guide</Link>
              </li>
              <li>
                <Link href="/shopify-automation-vs-apps">Automation vs Apps</Link>
              </li>
              <li>
                <Link href="/shopify-customer-support-automation">AI Support Routing</Link>
              </li>
              <li>
                <Link href="/shopify-customer-retention-automation">Retention Automation</Link>
              </li>
              <li>
                <Link href="/customer-data-compliance-checklist">Customer Data Checklist</Link>
              </li>
              <li>
                <Link href="/shopify-store-launch-checklist">Store Launch Checklist</Link>
              </li>
              <li>
                <Link href="/ecommerce-growth-context">eCommerce Growth</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 TeboaTech. All rights reserved.</p>
          <div className="footer-links">
            <Link href="/privacy-policy">Privacy Policy</Link>
            <Link href="/terms-of-service">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
