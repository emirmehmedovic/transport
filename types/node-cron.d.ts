declare module "node-cron" {
  type Task = {
    start: () => void;
    stop: () => void;
    destroy?: () => void;
  };

  type ScheduleOptions = {
    scheduled?: boolean;
    timezone?: string;
  };

  function schedule(
    expression: string,
    func: () => void,
    options?: ScheduleOptions
  ): Task;

  export default {
    schedule,
  };
  export { schedule };
}
