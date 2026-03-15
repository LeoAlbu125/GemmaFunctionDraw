import dynamic from "next/dynamic";
import styles from "./page.module.css";

const DrawingBoardWithAI = dynamic(
  () => import("@/app/components/DrawingBoardWithAI"),
  { ssr: false }
);

export default function Home() {
  return (
    <main className={styles.main}>
      <DrawingBoardWithAI />
    </main>
  );
}
