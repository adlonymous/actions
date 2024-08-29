import {
  createActionHeaders,
  NextActionPostRequest,
  ActionError,
  CompletedAction,
} from '@solana/actions';
import { clusterApiUrl, Connection, PublicKey } from '@solana/web3.js';

const headers = createActionHeaders();

export const GET = async (req: Request) => {
  return Response.json({ message: 'Method not supported' } as ActionError, {
    status: 403,
    headers,
  });
};

export const OPTIONS = async () => Response.json(null, { headers });

export const POST = async (req: Request) => {
  try {
    const url = new URL(req.url);

    const body: NextActionPostRequest = await req.json();

    console.log('body:', body);

    let account: PublicKey;
    try {
      account = new PublicKey(body.account);
    } catch (err) {
      throw 'Invalid "account" provided';
    }

    let signature: string;
    try {
      signature = body.signature;
      if (!signature) throw 'Invalid signature';
    } catch (err) {
      throw 'Invalid "signature" provided';
    }

    const connection = new Connection(
      process.env.SOLANA_RPC! || clusterApiUrl('devnet'),
    );

    try {
      let status = await connection.getSignatureStatus(signature);

      console.log('signature status:', status);

      if (!status) throw 'Unknown signature status';

      if (status.value?.confirmationStatus) {
        if (
          status.value.confirmationStatus != 'confirmed' &&
          status.value.confirmationStatus != 'finalized'
        ) {
          throw 'Unable to confirm the transaction';
        }
      }
    } catch (err) {
      if (typeof err == 'string') throw err;
      throw 'Unable to confirm the provided signature';
    }

    const transaction = await connection.getParsedTransaction(
      signature,
      'confirmed',
    );

    console.log('transaction: ', transaction);

    const payload: CompletedAction = {
      type: 'completed',
      title: 'Chaining was successful!',
      icon: new URL('/solana_devs.jpg', new URL(req.url).origin).toString(),
      label: 'Complete!',
      description:
        `You have now completed an action chain! ` +
        `Here was the signature from the last action's transaction: ${signature} `,
    };

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
