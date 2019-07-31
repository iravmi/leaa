import React, { useEffect } from 'react';

import { IPage } from '@leaa/dashboard/interfaces';
import { useTranslation } from 'react-i18next';
import { HtmlTitle } from '@leaa/dashboard/components/HtmlTitle';
// import { useQuery, useMutation } from '@apollo/react-hooks';
// import { GET_USERS } from '@leaa/common/graphqls';
// import { DELETE_USER } from '@leaa/common/graphqls/user.mutation';
// import { User } from '@leaa/common/entrys';
// import { UsersObject, UsersArgs } from '@leaa/common/dtos/user';
// import { PageCard } from '@leaa/dashboard/components/PageCard';
// import { ErrorCard } from '@leaa/dashboard/components/ErrorCard';
// import { message } from 'antd';

export default (props: IPage) => {
  const { t } = useTranslation();

  // const getUsersQuery = useQuery<{ users: UsersObject }, UsersArgs>(GET_USERS);

  return (
    <>
      <HtmlTitle title={t(`${props.route.namei18n}`)} />
      <p>: p</p>
    </>
  );

  // return getUsersQuery.error ? (
  //   <ErrorCard error={getUsersQuery.error} />
  // ) : (
  //   <PageCard loading={false}>TEST</PageCard>
  // );
};
