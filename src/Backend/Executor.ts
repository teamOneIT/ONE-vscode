/*
 * Copyright (c) 2022 Samsung Electronics Co., Ltd. All Rights Reserved
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// TODO: Uncomment after `Command` and `Toolchain` are landed
/*
import {Command} from '../Project/Command';

import {Toolchains} from './Toolchain';

// NOTE: This designs by feedback from kideuk.bang
// Tools to execute -> Exactly commands to execute tools
interface Executor {
  // defined/available toolchains
  toolchains(): Toolchains;

  inference(): Command;
}

// General excutor uses onecc so default jobs can be used
class ExecutorBase implements Executor {
  toolchains(): Toolchains {
    throw Error('Invalid toolchains call');
  }

  inference(): Command {
    throw Error('Invalid inference call');
  }
};

export {Executor, ExecutorBase};
*/