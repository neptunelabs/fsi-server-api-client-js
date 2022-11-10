import {expect} from 'chai';
import {APITask, APITasks} from "library/index";

const task: APITask = new APITask(null, {}, APITasks.queueStart, [999],
  APITasks.readListLocal, ["foo"]);


it('APITask.getMessage should return a task message', function () {
  const res = task.getMessage();
  expect(res).to.contain(" 999 ");
  expect(res).to.contain("\"foo\"");
});

it('APITask.getMainMessage should return the main task message', function () {
  const res = task.getMainMessage();
  expect(res).to.contain(" 999 ");
});

it('APITask.getSubMessage should return the sub task\'s message', function () {
  const res = task.getSubMessage();
  expect(res).to.contain("\"foo\"");
});


it('APITask.getMostDetailedMessage should return the task\'s most detailed message', function () {
  const res = task.getMostDetailedMessage();
  expect(res).to.contain("\"foo\"");
});
