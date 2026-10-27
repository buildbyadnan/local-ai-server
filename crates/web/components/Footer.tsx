/**
 * The credit line — always the bottom-most element on every page
 * (M10). Inside the chat shell it is the footer grid
 * row spanning all three columns; on the directory pages `margin-top: auto`
 * pins it to the bottom of the viewport when the content is short.
 *
 * The links leave for the system browser; the app itself never loads
 * anything remote (§9 M13's offline audit asserts it).
 */
export default function Footer() {
  return (
    <footer className="foot">
      Developed by{" "}
      <a
        href="https://github.com/buildbyadnan"
        target="_blank"
        rel="noopener noreferrer"
      >
        Adnan
      </a>{" "}
      ·{" "}
      <a
        href="https://github.com/buildbyadnan"
        target="_blank"
        rel="noopener noreferrer"
      >
        github.com/buildbyadnan
      </a>
    </footer>
  );
}
