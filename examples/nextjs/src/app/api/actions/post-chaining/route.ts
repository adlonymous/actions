import {
  ActionPostResponse,
  createPostResponse,
  MEMO_PROGRAM_ID,
  ActionGetResponse,
  ActionPostRequest,
  createActionHeaders,
  ActionError,
} from '@solana/actions';
import {
  clusterApiUrl,
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';

const headers = createActionHeaders();

export const GET = async (req: Request) => {
  const payload: ActionGetResponse = {
    type: 'action',
    title: 'Send Alice a Message',
    icon: 'https://ucarecdn.com/7aa46c85-08a4-4bc7-9376-88ec48bb1f43/-/preview/880x864/-/quality/smart/-/format/auto/',
    description: 'Send Alice a message on-chain using a Memo, redirects to xyz',
    label: 'Send Message',
    links: {
      actions: [
        {
          href: '/api/actions/post-chaining',
          label: 'Send Memo',
          parameters: [
            {
              patternDescription: 'Short message here',
              name: 'memo',
              label: 'Send a message on-chain using a Memo',
              type: 'textarea',
            },
          ],
        },
      ],
    },
  };

  return Response.json(payload, {
    headers,
  });
};

export const OPTIONS = async () => Response.json(null, { headers });

export const POST = async (req: Request) => {
  try {
    const body: ActionPostRequest<{ memo: string }> & {
      params: ActionPostRequest<{ memo: string }>['data'];
    } = await req.json();

    console.log('body:', body);

    let account: PublicKey;
    try {
      account = new PublicKey(body.account);
    } catch (err) {
      throw 'Invalid "account" provided';
    }

    const memoMessage = (body.params?.memo || body.data?.memo) as
      | string
      | undefined;

    if (!memoMessage) {
      throw 'Invalid "memo" provided';
    }

    const connection = new Connection(
      process.env.SOLANA_RPC! || clusterApiUrl('mainnet-beta'),
    );

    const transaction = new Transaction().add(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 1000,
      }),
      new TransactionInstruction({
        programId: new PublicKey(MEMO_PROGRAM_ID),
        data: Buffer.from(memoMessage, 'utf8'),
        keys: [],
      }),
    );

    transaction.feePayer = account;

    transaction.recentBlockhash = (
      await connection.getLatestBlockhash()
    ).blockhash;

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        transaction,
        message: 'Post this memo on-chain',
        links: {
          next: {
            type: 'post',
            href: '/api/actions/post-chaining/next-action',
          },
        },
      },
    });

    return Response.json(payload, {
      headers,
    });
  } catch (err) {
    console.log(err);
    let actionError: ActionError = { message: 'An unknown error occurred' };
    if (typeof err == 'string') actionError.message = err;
    return Response.json(actionError, {
      status: 400,
      headers,
    });
  }
};
