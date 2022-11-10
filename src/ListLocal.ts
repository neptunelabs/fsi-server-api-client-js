import {default as fs} from "fs";
import {APITasks, IAPITaskDef} from "./resources/APITasks";
import {FSIServerClientInterface} from "./FSIServerClientInterface";
import {FSIServerClientUtils, IPathAndDir} from "./FSIServerClientUtils";
import {
  IListData,
  IListEntry,
  IListEntryUpload,
  IListOptions,
  ILoopData,
  ListEntryType,
  ListServer
} from "./ListServer";
import {APIAbortController} from "./APIAbortController";
import {TaskController} from "./TaskController";
import {TaskProgress} from "./TaskProgress";
import {FSIServerClient} from "./index";
import {IAPIClassInit} from "./utils/IAPIClassInit";
import {LogLevel} from "./LogLevel";

interface IFiltersPassed {
  post: boolean,
  pre: boolean,
  passed: boolean
}

export class ListLocal {

  private readonly baseURL: string;
  private readonly client: FSIServerClient;
  private readonly com: FSIServerClientInterface;

  constructor(private readonly classInit: IAPIClassInit, private taskController: TaskController) {
    this.client = classInit.client;
    this.com = classInit.com;

    this.baseURL = this.client.getServerBaseQuery();
  }

  private static async applyFilters(options: IListOptions, ld: IListData, entry: IListEntry): Promise<IFiltersPassed> {

    const res: IFiltersPassed = {
      passed: true,
      post: true,
      pre: true
    };

    if (options.fnDirFilter && entry.type === "directory" && !await options.fnDirFilter(ld, entry)) {
      res.passed = false;
      res.pre = false;
    }

    if (res.pre && options.fnFileFilter && entry.type === "file" && !await options.fnFileFilter(ld, entry)) {
      res.passed = false;
      res.post = false;
    }

    return res;
  }

  private static addDirEntryFromPath(ld: IListData, path: string): IListEntry {

    const baseDir: IPathAndDir = FSIServerClientUtils.EXTRACT_LAST_DIR(path);

    const entry: IListEntry = {
      _listData: ld,
      height: 0,
      lastModified: 0,
      path,
      size: 0,
      src: baseDir.dir,
      type: "directory",
      width: 0,
    };

    ld.entries.push(entry);

    ld.summary.entryCount++;
    ld.summary.directoryCount++;
    ld.summary.clientInfo.entryCount++;
    ld.summary.clientInfo.directoryCount++;

    return entry;
  }

  public read(path: string, options: IListOptions = {}): Promise<IListData> {

    this.taskController.setCurrentTask(LogLevel.debug, APITasks.readListLocal, [path]);

    const self = this;
    path = FSIServerClientUtils.TRANSFORM_LOCAL_PATH(path);
    path = FSIServerClientUtils.NORMALIZE_PATH(path);

    const loopData: ILoopData = {
      blackList: {},
      checkConnectorType: true,
      maxDepth: 0,
      note: "",
      validConnectorTypes: {},
      canceled: false
    };

    if (options.maxRecursiveDepth === undefined) {
      options.maxRecursiveDepth = 255;
    }


    let typeFilter: string = options.typeFilter || "all";

    if (typeFilter !== "all") {
      if (typeFilter !== "directory") {
        typeFilter = "file";
      }
    }

    const useDirs: boolean = (typeFilter === "all" || typeFilter === "directory");
    const useFiles: boolean = (typeFilter === "all" || typeFilter === "file");

    return new Promise((resolve, reject): void => {

      self.listDataFromLocalDir(path, options, useDirs, useFiles, 0, loopData, 0, 100)
        .then((res) => {
          resolve(res);
        })
        .catch(err => {
          reject(err);
        })
    });
  }

  public addItemsFromDataTransferItemList(fl: DataTransferItemList, options: IListOptions = {}): Promise<IListData> {

    const ld: IListData = ListServer.GET_EMPTY_LIST_DATA();
    ld.summary._baseDir = "";
    ld.summary.connectorType = "LOCAL";
    const self = this;

    let prgSize: number;
    let prgPos: number = 0;


    if (options.fnProgress !== undefined || options._fnQueueProgress !== undefined) {
      options._taskProgress = new TaskProgress();
    }

    return new Promise<IListData>(async (resolve, reject) => {

      const addFile = (entry: any): Promise<IFiltersPassed> => {

        return new Promise((resolveInner): void => {

          APIAbortController.THROW_IF_ABORTED(options.abortController);

          const addEntry = async (listEntry: IListEntryUpload): Promise<void> => {
            const resFilter: IFiltersPassed = await ListLocal.applyFilters(options, ld, listEntry);

            if (resFilter.passed) {
              ld.entries.push(listEntry);
              ld.summary.entryCount++;
              ld.summary.imageCount++;
              ld.summary.clientInfo.fileCount++;
              ld.summary.clientInfo.entryCount++;
              ld.summary.clientInfo.totalSize += listEntry.size;
            }

            resolveInner(resFilter);
          };


          if (entry.file) {
            entry.file(async (file: File) => {

                const mime: string = (file && file.type) ? file.type : "";
                const size: number = (file) ? file.size : 0;

                const listEntry: IListEntryUpload = {
                  _listData: ld,
                  file,
                  height: 0,
                  lastModified: file.lastModified,
                  mime,
                  path: entry.fullPath,
                  size,
                  src: entry.name,
                  type: 'file',
                  width: 0
                };

                await addEntry(listEntry);
              },
              reject);
          } else {
            const mime: string = entry.type || "";
            const size: number = entry.size || 0;

            const listEntry: IListEntryUpload = {
              _listData: ld,
              file: entry,
              height: 0,
              lastModified: entry.lastModified,
              mime,
              path: entry.name,
              size,
              src: entry.name,
              type: 'file',
              width: 0
            };

            addEntry(listEntry);
          }

        });
      };

      const addDir = async (entry: any): Promise<IFiltersPassed> => {

        APIAbortController.THROW_IF_ABORTED(options.abortController);

        const listEntry: IListEntryUpload = {
          _listData: ld,
          file: null,
          height: 0,
          lastModified: 0,
          mime: "",
          path: entry.fullPath,
          size: 0,
          src: entry.name,
          type: 'directory',
          width: 0,
        };

        const resFilter: IFiltersPassed = await ListLocal.applyFilters(options, ld, listEntry);

        if (resFilter.passed) {
          ld.entries.push(listEntry);
          ld.summary.entryCount++;
          ld.summary.directoryCount++;
          ld.summary.clientInfo.entryCount++;
          ld.summary.clientInfo.directoryCount++;
        }

        return resFilter;
      };

      const toArray = (list: any[]): any[] => {
        return Array.prototype.slice.call(list || [], 0);
      };


      const getSubdirectories = async (entry: any, dirReader: any, atLevel: number,
                                       progressStart: number, progressSize: number): Promise<boolean> => {

        ld.summary.clientInfo.maxDepth = Math.max(ld.summary.clientInfo.maxDepth, atLevel);

        return new Promise((resolveInner: (arg: boolean) => void, rejectInner: (arg: any) => void): void => {


          let added: number = 0;

          const onDirEntries = async (results: any[]): Promise<void> => {

            APIAbortController.THROW_IF_ABORTED(options.abortController);

            if (results.length > 0) {

              const subSize: number = progressSize / (added + results.length);

              const entries: any[] = toArray(results);

              for (const theEntry of entries) {
                added++;
                const subStart: number = progressStart + subSize * added;
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                await consumeEntry(theEntry, atLevel, subStart, subSize);
              }

              // continue reading more entries...
              dirReader.readEntries(onDirEntries, reject);
            } else {
              resolveInner(true);
            }
          };

          dirReader.readEntries(onDirEntries, rejectInner);
        });
      };

      const consumeEntry = async (entry: any, atLevel: number, pPos: number, pSize: number): Promise<void> => {

        if (options._taskProgress) {

          const task: IAPITaskDef = (entry.isDirectory) ? APITasks.readSubDir : APITasks.processFile;
          self.callProgress(LogLevel.trace, options, task, [entry.name, atLevel],
            pPos, prgSize);
        }

        if (entry.isDirectory === true) {
          const resFilter: IFiltersPassed = await addDir(entry);
          if (resFilter.pre && options.recursive) {
            await getSubdirectories(entry, entry.createReader(), atLevel + 1, pPos, pSize / prgSize);
          }

        } else if (entry.isFile === true) {
          await addFile(entry);
        }

      };

      // collect all entries first,
      // because fl:DataTransferItemList will be empty after calling an async function

      const mainEntries: any[] = [];

      for (let i = 0; i < fl.length; i++) {
        APIAbortController.THROW_IF_ABORTED(options.abortController);

        const item: DataTransferItem = fl[i];
        if (item.kind === "file" && item.webkitGetAsEntry) {
          mainEntries.push(item.webkitGetAsEntry());
        } else {
          const fileItem: any = fl[i];
          fileItem.isFile = true;
          mainEntries.push(fileItem);
        }
      }

      prgSize = mainEntries.length;


      setTimeout(async () => {

        // iterate over all main entries and add files/subdirectories
        for (let i = 0; i < mainEntries.length; i++) {

          APIAbortController.THROW_IF_ABORTED(options.abortController);

          prgPos = i;
          await consumeEntry(mainEntries[i], 0, prgPos, prgSize);
        }

        return resolve(ld);

      }, 0);
    });
  }

  private callProgress(level: number, options: IListOptions, apiTaskDef: IAPITaskDef, content: any[],
                       pos: number = 0, length: number = 0): void {

    this.taskController.onStepProgress(level, options, apiTaskDef, content, pos, length);
  }

  private listDataFromLocalDir(path: string, options: IListOptions = {},
                               useDirs: boolean, useFiles: boolean, depth: number = 0,
                               loopData: ILoopData, progressStart: number, progressSize: number): Promise<IListData> {

    this.taskController.setCurrentTask(LogLevel.debug, APITasks.readListLocal, [path]);

    if (options.fnProgress !== undefined || options._fnQueueProgress !== undefined) {
      options._taskProgress = new TaskProgress();
      options._taskProgress.currentTask = this.com.taskSupplier.get(APITasks.readListLocal, [path]);
    }

    const dirs: IListEntry[] = [];

    const ld: IListData = ListServer.GET_EMPTY_LIST_DATA();
    ld.summary.connectorType = "LOCAL";
    ld.summary.dir = path;


    // create entry for the base path
    if (depth === 0) {
      if (!options.dropEntries) ListLocal.addDirEntryFromPath(ld, path);
      else {
        ld.summary.entryCount++;
        ld.summary.directoryCount++;
      }
    }


    const self = this;
    loopData.maxDepth = Math.max(loopData.maxDepth, depth);

    return new Promise((resolve, reject): void => {

      APIAbortController.THROW_IF_ABORTED(options.abortController);

      const getSubdirectories = async (): Promise<void> => {

        APIAbortController.THROW_IF_ABORTED(options.abortController);

        const prgSize: number = (dirs.length === 0) ? 0 : progressSize / dirs.length;

        for (let i = 0; i < dirs.length; i++) {

          const entry: IListEntry = dirs[i];
          const prgStart: number = progressStart + prgSize * i;

          self.callProgress(LogLevel.trace, options, APITasks.readSubDir, [entry.path, depth],
            prgStart, 100);

          await self.listDataFromLocalDir(
            entry.path, options, useDirs, useFiles,
            depth + 1, loopData, prgStart, prgSize)
            .then((ldSub) => {

              APIAbortController.THROW_IF_ABORTED(options.abortController);

              // ld is the listData of the current(!) dir
              ld.summary.entryCount += ldSub.summary.entryCount;
              ld.summary.directoryCount += ldSub.summary.directoryCount;
              ld.summary.imageCount += ldSub.summary.imageCount;
              ld.summary.completeCount += ldSub.summary.completeCount;
              ld.summary.clientInfo.totalSize += ldSub.summary.clientInfo.totalSize;

              if (!options.dropEntries) ld.entries = ld.entries.concat(ldSub.entries);
            })

            .catch(err => {

              if (this.com.isAbortError(err) || (!options.continueOnError)) {
                throw err;
              }

              if (options._fnQueueError !== undefined) {
                options._fnQueueError.fn.call(options._fnQueueError.ctx, err);
              }

              self.taskController.error(err);
            });
        }
      };

      const listFinished = (): any => {

        if (!options.recursive
          || (options.maxRecursiveDepth === undefined || depth >= options.maxRecursiveDepth)) {
          return resolve(ld);
        }

        return getSubdirectories().then(() => {

          if (depth === 0) {

            if (loopData.note === "") {
              loopData.note = "complete";
            }

            ld.summary.clientInfo.note = loopData.note;
            ld.summary.clientInfo.maxDepth = loopData.maxDepth;
            ld.summary.clientInfo.directoryCount = ld.summary.directoryCount;
            ld.summary.clientInfo.fileCount = ld.summary.imageCount;
            ld.summary.clientInfo.entryCount = ld.summary.entryCount;

            this.taskController.resetSubTask();
          }

          return resolve(ld);
        })
          .catch(err => {
            reject(err);
          });
      };


      const onResult = (err: Error | null, res: string[] | Buffer[] | fs.Dirent[]): void => {

        if (err !== null) {
          reject(err);
        } else {

          let i: number = 0;

          const nextEntry = (): void => {

            if (i === res.length) {
              listFinished();
            } else {

              APIAbortController.THROW_IF_ABORTED(options.abortController);

              let entryPath: string = path + res[i];
              fs.stat(entryPath, async (error, stat) => {

                if (error) {
                  self.taskController.errorNative(error);
                } else {

                  let type: ListEntryType | null = null;

                  if (stat.isDirectory()) {
                    entryPath = FSIServerClientUtils.NORMALIZE_PATH(entryPath);
                    if (useDirs) {
                      type = "directory";
                    }
                  } else if (stat.isFile()) {
                    if (useFiles) {
                      type = "file";
                    }
                  }

                  if (type) {
                    const entry: IListEntry = {
                      _listData: ld,
                      height: 0,
                      lastModified: Math.floor(stat.mtimeMs),
                      path: entryPath,
                      size: stat.size,
                      src: res[i] as string,
                      type,
                      width: 0,
                    };

                    const resFilter: IFiltersPassed = await ListLocal.applyFilters(options, ld, entry);

                    if (resFilter.pre) {
                      if (type === "directory") {
                        dirs.push(entry);
                      }
                    }

                    if (resFilter.passed) {
                      ld.summary.entryCount++;
                      if (!options.dropEntries) ld.entries.push(entry);

                      if (type === "file") {
                        ld.summary.imageCount++;
                        ld.summary.clientInfo.totalSize += entry.size;
                      } else {
                        ld.summary.directoryCount++;
                      }
                    }
                  }
                }
                i++;
                nextEntry();
              });
            }
          };
          nextEntry();
        }
      };

      fs.readdir(path, {withFileTypes: false}, onResult);
    });
  }
}
