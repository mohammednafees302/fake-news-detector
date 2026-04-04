import { Link } from 'react-router-dom';

function Footer() {
    return (
        <footer className="footer">
            <div className="footer-inner">
                <div className="footer-brand">
                    <h3>🛡️ Verify<span className="gradient-text">News</span> AI</h3>
                    <p>
                        Advanced multi-factor credibility analysis to help you identify
                        misinformation and make informed decisions about the news you read.
                    </p>
                </div>

                <div className="footer-section">
                    <h4>Product</h4>
                    <Link to="/analyze" className="footer-link">News Analyzer</Link>
                    <Link to="/dashboard" className="footer-link">Dashboard</Link>
                    <Link to="/report" className="footer-link">Report Fake News</Link>
                </div>

                <div className="footer-section">
                    <h4>Resources</h4>
                    <a href="#" className="footer-link">How It Works</a>
                    <a href="#" className="footer-link">API Documentation</a>
                    <a href="#" className="footer-link">Source Database</a>
                </div>

                <div className="footer-section">
                    <h4>Legal</h4>
                    <a href="#" className="footer-link">Privacy Policy</a>
                    <a href="#" className="footer-link">Terms of Service</a>
                    <a href="#" className="footer-link">Contact Us</a>
                </div>
            </div>

            <div className="footer-bottom">
                <span>© 2026 VerifyNews AI. All rights reserved.</span>
                <span>Built with 🤍 for truth in journalism</span>
            </div>
        </footer>
    );
}

export default Footer;
