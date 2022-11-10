import {FSIServerClient} from "../index";
import {FSIServerClientInterface} from "../FSIServerClientInterface";

export interface IAPIClassInit {
  client: FSIServerClient,
  com: FSIServerClientInterface
}
