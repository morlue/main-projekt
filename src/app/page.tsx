import { FuelingPlanner } from "@/components/FuelingPlanner";
import { defaultIngredients } from "@/lib/ingredients";

export default function Home() {
  return <FuelingPlanner ingredients={defaultIngredients} />;
}
