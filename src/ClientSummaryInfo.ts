export class ClientSummaryInfo {
  public note: string = "";
  public totalSize: number = 0;
  public maxDepth: number = 0;
  public directoryCount: number = 0;
  public fileCount: number = 0;
  public entryCount: number = 0;
  public importStates: { [key: number]: number; } = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0
  }
}
