import { Args, Query, Mutation, Resolver } from '@nestjs/graphql';
import { Int } from 'type-graphql';

import { Role, User } from '@leaa/common/src/entrys';
import {
  RolesArgs,
  RolesWithPaginationObject,
  RoleArgs,
  CreateRoleInput,
  UpdateRoleInput,
} from '@leaa/common/src/dtos/role';
import { RoleService } from '@leaa/api/src/modules/role/role.service';
import { UserDecorator } from '@leaa/api/src/decorators';

@Resolver(() => Role)
export class RoleResolver {
  constructor(private readonly roleService: RoleService) {}

  @Query(() => RolesWithPaginationObject)
  async roles(@Args() args: RolesArgs, @UserDecorator() user?: User): Promise<RolesWithPaginationObject | undefined> {
    return this.roleService.roles(args, user);
  }

  @Query(() => Role)
  async role(
    @Args({ name: 'id', type: () => Int }) id: number,
    @Args() args?: RoleArgs,
    @UserDecorator() user?: User,
  ): Promise<Role | undefined> {
    return this.roleService.role(id, args, user);
  }

  @Mutation(() => Role)
  async createRole(@Args('role') args: CreateRoleInput, @UserDecorator() user?: User): Promise<Role | undefined> {
    return this.roleService.createRole(args, user);
  }

  @Mutation(() => Role)
  async updateRole(
    @Args({ name: 'id', type: () => Int }) id: number,
    @Args('role') args: UpdateRoleInput,
    @UserDecorator() user?: User,
  ): Promise<Role | undefined> {
    return this.roleService.updateRole(id, args, user);
  }

  @Mutation(() => Role)
  async deleteRole(
    @Args({ name: 'id', type: () => Int }) id: number,
    @UserDecorator() user?: User,
  ): Promise<Role | undefined> {
    return this.roleService.deleteRole(id, user);
  }
}
