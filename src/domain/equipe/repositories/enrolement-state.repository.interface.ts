export interface EnrolementStateRepository {
  isCloture(): Promise<boolean>;
  cloturer(): Promise<void>;
  decloturer(): Promise<void>;
}
