import { logoAssetUrl } from "../lib/assets";

type DownloadPageProps = {
  macInstallerUrl: string;
  windowsInstallerUrl: string;
  linuxInstallerUrl: string;
  onBackHome: () => void;
  onStartChatting: () => void;
};

function DownloadPage({
  macInstallerUrl,
  windowsInstallerUrl,
  linuxInstallerUrl,
  onBackHome,
  onStartChatting,
}: DownloadPageProps) {
  return (
    <main className="downloadPage">
      <section className="downloadHero">
        <div className="downloadBrand">
          <img className="downloadBrandLogo" src={logoAssetUrl} alt="Glytch Chat logo" />
          <p className="downloadKicker">Glytch Chat Desktop</p>
        </div>
        <h1>Download Glytch Chat</h1>
        <p className="downloadBody">Choose your operating system to download the desktop installer.</p>
        <div className="downloadActions">
          <button type="button" className="landingSecondary" onClick={onBackHome}>
            Back
          </button>
          <button type="button" className="landingPrimary" onClick={onStartChatting}>
            Start chatting on web
          </button>
        </div>
      </section>

      <section className="downloadGrid" aria-label="Desktop installers">
        <article className="downloadCard">
          <h2>macOS</h2>
          <p>Download the `.dmg` installer for Apple Silicon or Intel Macs.</p>
          <a className="downloadButton" href={macInstallerUrl}>
            Download for macOS
          </a>
        </article>
        <article className="downloadCard">
          <h2>Windows</h2>
          <p>Download the `.exe` installer for Windows 10 and 11.</p>
          <a className="downloadButton" href={windowsInstallerUrl}>
            Download for Windows
          </a>
        </article>
        <article className="downloadCard">
          <h2>Linux</h2>
          <p>Download the `.AppImage` package for desktop Linux.</p>
          <a className="downloadButton" href={linuxInstallerUrl}>
            Download for Linux
          </a>
        </article>
      </section>
    </main>
  );
}

export default DownloadPage;
