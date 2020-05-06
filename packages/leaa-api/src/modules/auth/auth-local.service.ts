import _ from 'lodash';
import moment from 'moment';
import svgCaptcha from 'svg-captcha';
import xss from 'xss';
import bcryptjs from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { Injectable } from '@nestjs/common';
import { Repository, Between, In } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { User, Verification, Action } from '@leaa/common/src/entrys';
import { AuthLoginInput, AuthSignupInput } from '@leaa/common/src/dtos/auth';
import { authUtil, loggerUtil, msgUtil } from '@leaa/api/src/utils';
import { UserService } from '@leaa/api/src/modules/user/user.service';
import { AuthService } from '@leaa/api/src/modules/auth/auth.service';
import { ActionService } from '@leaa/api/src/modules/action/action.service';
import { IGqlCtx } from '@leaa/api/src/interfaces';
import { captchaConfig } from '@leaa/api/src/configs';

const CLS_NAME = 'AuthLocalService';

const CHECK_GUEST_COUNT_BEFORE_MINUTE = 30;
const SHOW_TOO_MANY_REQUEST_COUNT = 100;
const SHOW_CAPTCHA_BY_LOGIN_ERROR_COUNT = 3;

@Injectable()
export class AuthLocalService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Verification) private readonly verificationRepository: Repository<Verification>,
    @InjectRepository(Action) private readonly actionRepository: Repository<Action>,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly authService: AuthService,
    private readonly actionService: ActionService,
  ) {}

  async login(args: AuthLoginInput, gqlCtx?: IGqlCtx): Promise<User | undefined> {
    if (!gqlCtx || !gqlCtx.req?.ip) throw msgUtil.error({ t: ['_error:notFoundIp'], gqlCtx });

    const account = xss.filterXSS(args.email.trim().toLowerCase());

    const findUser = await this.userRepository.findOne({
      select: ['id', 'email', 'name', 'status', 'password', 'avatar_url'],
      where: {
        email: account,
      },
      // for get flatPermissions
      relations: ['roles'],
    });

    // log
    const loginAction = await this.actionService.createAction({
      ip: gqlCtx?.req?.ip,
      module: 'auth',
      action: 'login',
      token: args.guestToken,
      account,
    });

    const user = authUtil.checkAvailableUser(findUser, gqlCtx);

    // log with user_id
    if (loginAction?.id) await this.actionService.updateAction(loginAction.id, { user_id: user.id });

    //
    //
    // Captcha
    //
    // check Login Count at Actions
    const loginCount = await this.actionRepository.count({
      where: {
        ip: gqlCtx?.req?.ip,
        module: 'auth',
        action: 'login',
        account,
        created_at: Between(moment().subtract(CHECK_GUEST_COUNT_BEFORE_MINUTE, 'minute').toDate(), moment().toDate()),
      },
    });

    // check Captcha
    // `SHOW_CAPTCHA_BY_LOGIN_ERROR_COUNT` MUST + 2, becuse user has not seen the verify code now.
    if (loginCount >= SHOW_CAPTCHA_BY_LOGIN_ERROR_COUNT + 2) {
      if (!args.guestToken) throw msgUtil.error({ t: ['_error:notFoundToken'], gqlCtx });

      const captcha = await this.verificationRepository.findOne({ token: args.guestToken, code: args.captcha });
      if (!captcha) throw msgUtil.error({ t: ['_error:verifyCodeNotMatch'], gqlCtx });
    }

    //
    //
    // Password
    //
    // check Password
    const passwordIsMatch = await bcryptjs.compareSync(args.password, user.password);

    if (!passwordIsMatch) {
      const errorMessage = `User (${account}) Info Not Match`;
      loggerUtil.log(errorMessage, CLS_NAME);

      throw msgUtil.error({ t: ['_error:userInfoNotMatch'], gqlCtx });
    }

    if (user.password) delete user.password;

    loggerUtil.log(`Local Login Auth, ${JSON.stringify(user)}`, CLS_NAME);

    // last, clear Action and Verification
    await this.clearLoginActionAndVerification({ token: args.guestToken });

    return this.authService.addTokenToUser(user);
  }

  async clearLoginActionAndVerification({ token }: { token?: string }) {
    await this.actionRepository.delete({ module: 'auth', action: In(['login', 'guest']), token: In([token, null]) });
    await this.verificationRepository.delete({ token });
  }

  async signup(args: AuthSignupInput, uid?: string, gqlCtx?: IGqlCtx): Promise<User | undefined> {
    const nextArgs: AuthSignupInput = { name: '', password: '', email: '' };

    _.forEach(args, (v, i) => {
      nextArgs[i as 'name' | 'email'] = xss.filterXSS(v || '');
    });

    if (args.password) {
      nextArgs.password = await this.userService.createPassword(args.password);
    }

    nextArgs.email = nextArgs.email.toLowerCase();

    let newUser: User;

    try {
      newUser = await this.userRepository.save({
        ...nextArgs,
        status: 1,
      });

      loggerUtil.log(`Local Singup Succeed, ${JSON.stringify({ ...newUser, password: '******' })}`, CLS_NAME);

      if (uid) {
        await this.authService.bindUserIdToAuth(newUser, uid, gqlCtx);
        await this.authService.clearTicket(uid);
      }
    } catch (error) {
      loggerUtil.log(`Local Singup Error, ${JSON.stringify(error)}`, CLS_NAME);

      throw msgUtil.error({ t: ['_error:signupFailed'], gqlCtx });
    }

    return this.authService.addTokenToUser(newUser);
  }

  async createGuest(showCaptcha?: boolean): Promise<Verification | undefined> {
    const captcha = svgCaptcha.create(captchaConfig.SVG_CAPTCHA);

    const guest = await this.verificationRepository.save({
      code: captcha.text.toLowerCase(),
      token: this.jwtService.sign({}),
    });

    if (showCaptcha) guest.captcha = captcha.data;

    delete guest.code;

    return guest;
  }

  async guest(token?: string, gqlCtx?: IGqlCtx): Promise<Verification | undefined> {
    if (!gqlCtx || !gqlCtx.req?.ip) throw msgUtil.error({ t: ['_error:notFoundIp'], gqlCtx });

    // Prevent hacking ( 30min - MAX - 100req)
    const guestCount = await this.actionRepository.count({
      where: {
        ip: gqlCtx?.req?.ip,
        module: 'auth',
        action: 'guest',
        created_at: Between(moment().subtract(CHECK_GUEST_COUNT_BEFORE_MINUTE, 'minute').toDate(), moment().toDate()),
      },
    });

    if (guestCount >= SHOW_TOO_MANY_REQUEST_COUNT) throw msgUtil.error({ t: ['_error:tooManyRequest'], gqlCtx });

    // Controller Captcha Show (for Dashboard)
    // Just showCaptcha, but whether login depends on the `account` at Table `actions`
    const loginCount = await this.actionRepository.count({
      where: {
        ip: gqlCtx?.req?.ip,
        module: 'auth',
        action: 'login',
        created_at: Between(moment().subtract(CHECK_GUEST_COUNT_BEFORE_MINUTE, 'minute').toDate(), moment().toDate()),
      },
    });

    const showCaptcha = loginCount > SHOW_CAPTCHA_BY_LOGIN_ERROR_COUNT;

    // log
    await this.actionService.createAction({
      ip: gqlCtx?.req?.ip,
      module: 'auth',
      action: 'guest',
      token,
    });

    const captcha = svgCaptcha.create(captchaConfig.SVG_CAPTCHA);
    const guest = await this.verificationRepository.findOne({ token });

    if (token && guest?.id) {
      await this.verificationRepository.update(guest.id, { code: captcha.text.toLowerCase() });

      if (showCaptcha) guest.captcha = captcha.data;
      delete guest.code;

      return guest;
    }

    return this.createGuest(showCaptcha);
  }
}
