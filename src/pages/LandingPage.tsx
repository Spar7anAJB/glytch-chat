import { logoAssetUrl } from "../lib/assets";

type LandingPageProps = {
  onGoToAuth: () => void;
  onGoToDownload: () => void;
};

function LandingPage({ onGoToAuth, onGoToDownload }: LandingPageProps) {
  return (
    <main className="landingPage">
      <section className="landingHero">
        <div className="landingBrand">
          <img className="landingBrandLogo" src={logoAssetUrl} alt="Glytch Chat logo" />
          <p className="landingKicker">Glytch Chat Platform</p>
        </div>
        <h1>Welcome to Glytch Chat</h1>
        <p className="landingBody">
          Start chatting in your browser or download the desktop app installer for your device.
        </p>
        <div className="landingActions">
          <button type="button" className="landingPrimary" onClick={onGoToAuth}>
            Start chatting
          </button>
          <button type="button" className="landingSecondary" onClick={onGoToDownload}>
            Download desktop app
          </button>
        </div>
      </section>

      <section className="landingGrid" aria-label="Start options">
        <article>
          <h2>Web app</h2>
          <p>Use Start chatting to open the web sign-in page, then continue into the chat workspace.</p>
        </article>
        <article>
          <h2>Desktop app</h2>
          <p>Use Download desktop app to get the Electron installer and run Glytch Chat locally.</p>
        </article>
        <article>
          <h2>Single account flow</h2>
          <p>Both web and desktop use the same login/signup system and route into the same app experience.</p>
        </article>
      </section>
    </main>
  );
}

export default LandingPage;
