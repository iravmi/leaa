import { Args, Query, Mutation, Resolver, ResolveProperty, Parent } from '@nestjs/graphql';
import { Int } from 'type-graphql';

import { Promo, User } from '@leaa/common/src/entrys';
import {
  PromosArgs,
  PromosWithPaginationObject,
  PromoArgs,
  CreatePromoInput,
  UpdatePromoInput,
  RedeemPromoInput,
} from '@leaa/common/src/dtos/promo';
import { UserDecorator } from '@leaa/api/src/decorators';
import { PromoService } from '@leaa/api/src/modules/promo/promo.service';
import { PromoProperty } from '@leaa/api/src/modules/promo/promo.property';

@Resolver(() => Promo)
export class PromoResolver {
  constructor(private readonly promoService: PromoService, private readonly promoProperty: PromoProperty) {}

  @ResolveProperty(() => Boolean)
  async available(@Parent() promo: Promo): Promise<boolean> {
    return this.promoProperty.available(promo);
  }

  //
  //

  @Query(() => PromosWithPaginationObject)
  async promos(
    @Args() args: PromosArgs,
    @UserDecorator() user?: User,
  ): Promise<PromosWithPaginationObject | undefined> {
    return this.promoService.promos(args, user);
  }

  @Query(() => Promo)
  async promo(
    @Args({ name: 'id', type: () => Int }) id: number,
    @Args() args?: PromoArgs,
    @UserDecorator() user?: User,
  ): Promise<Promo | undefined> {
    return this.promoService.promo(id, args, user);
  }

  @Query(() => Promo)
  async promoByCode(
    @Args({ name: 'code', type: () => String }) code: string,
    @Args() args?: PromoArgs,
    @UserDecorator() user?: User,
  ): Promise<Promo | undefined> {
    return this.promoService.promoByCode(code, args, user);
  }

  @Mutation(() => Promo)
  async createPromo(@Args('promo') args: CreatePromoInput): Promise<Promo | undefined> {
    return this.promoService.createPromo(args);
  }

  @Mutation(() => Promo)
  async updatePromo(
    @Args({ name: 'id', type: () => Int }) id: number,
    @Args('promo') args: UpdatePromoInput,
  ): Promise<Promo | undefined> {
    return this.promoService.updatePromo(id, args);
  }

  @Mutation(() => Promo)
  async redeemPromo(@Args('info') info: RedeemPromoInput, @UserDecorator() user?: User): Promise<Promo | undefined> {
    return this.promoService.redeemPromo(info, user);
  }

  @Mutation(() => Promo)
  async deletePromo(@Args({ name: 'id', type: () => Int }) id: number): Promise<Promo | undefined> {
    return this.promoService.deletePromo(id);
  }
}
