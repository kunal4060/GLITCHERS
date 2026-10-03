import { buildApp } from '../src/app.js';
import type { FastifyInstance } from 'fastify';

describe('Onboarding & First-Time Student Experience API', () => {
  let app: FastifyInstance;
  const authHeaders = {
    authorization: 'Bearer dev-token',
  };

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  test('GET /api/onboarding/status returns onboarding state', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/onboarding/status',
      headers: authHeaders,
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.body);
    expect(json.state).toBeDefined();
    expect(json.state.currentStep).toBeDefined();
  });

  test('PATCH /api/onboarding/step saves profile step and updates state incrementally', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/onboarding/step',
      headers: authHeaders,
      payload: {
        step: 'PROFILE',
        data: {
          fullName: 'Kunal Ugale',
          university: 'State Technological University',
          course: 'B.Tech Computer Science',
          year: 3,
          semester: 6,
          section: 'B',
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.body);
    expect(json.success).toBe(true);
    expect(json.state.currentStep).toBe('PROFILE');
    expect(json.state.completedSteps).toContain('PROFILE');
    expect(json.state.data.course).toBe('B.Tech Computer Science');
  });

  test('PATCH /api/onboarding/step validates CGPA within range 0.00 - 10.00', async () => {
    const invalidRes = await app.inject({
      method: 'PATCH',
      url: '/api/onboarding/step',
      headers: authHeaders,
      payload: {
        step: 'ACADEMICS',
        data: {
          cgpa: '14.5',
        },
      },
    });

    expect(invalidRes.statusCode).toBe(400);

    const validRes = await app.inject({
      method: 'PATCH',
      url: '/api/onboarding/step',
      headers: authHeaders,
      payload: {
        step: 'ACADEMICS',
        data: {
          cgpa: '8.75',
          creditsCompleted: 45,
          creditsCurrent: 18,
        },
      },
    });

    expect(validRes.statusCode).toBe(200);
    const validJson = JSON.parse(validRes.body);
    expect(validJson.state.data.cgpa).toBe('8.75');
  });

  test('POST /api/onboarding/initialize runs idempotent initialization pipeline', async () => {
    const payload = {
      complete: true,
      profile: {
        fullName: 'Kunal Ugale',
        university: 'State Technological University',
        course: 'Computer Science',
        year: 3,
        semester: 6,
        cgpa: '8.75',
        universityDomain: 'university.edu',
      },
      classes: [
        {
          subjectName: 'Artificial Intelligence',
          day: 'MONDAY',
          startTime: '09:00',
          endTime: '10:00',
          room: 'AB3-105',
          faculty: 'Dr. Iyer',
          classType: 'LECTURE',
        },
        {
          subjectName: 'Database Management Systems',
          day: 'MONDAY',
          startTime: '10:00',
          endTime: '11:00',
          room: 'AB1-204',
          faculty: 'Dr. Sharma',
          classType: 'LECTURE',
        },
      ],
      notificationSettings: {
        classReminderMinutes: 10,
        quietHoursEnabled: true,
        quietHoursStart: '23:00',
        quietHoursEnd: '07:00',
      },
      financeSettings: {
        startingBalance: 8500,
        monthlyBudget: 10000,
      },
    };

    // First run
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/onboarding/initialize',
      headers: authHeaders,
      payload,
    });

    expect(res1.statusCode).toBe(200);
    const json1 = JSON.parse(res1.body);
    expect(json1.success).toBe(true);
    expect(json1.isComplete).toBe(true);
    expect(json1.job.status).toBe('COMPLETED');
    expect(json1.job.stepStatuses.timetable.status).toBe('COMPLETED');

    // IDEMPOTENCY CHECK: Run initialization a second time
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/onboarding/initialize',
      headers: authHeaders,
      payload,
    });

    expect(res2.statusCode).toBe(200);
    const json2 = JSON.parse(res2.body);
    expect(json2.success).toBe(true);

    // Verify classes were not duplicated
    const classesRes = await app.inject({
      method: 'GET',
      url: '/api/timetable/classes',
      headers: authHeaders,
    });
    const classesJson = JSON.parse(classesRes.body);
    const aiClasses = classesJson.classes.filter(
      (c: any) => c.subjectName.toLowerCase().includes('artificial intelligence') && c.day === 'MONDAY' && c.startTime === '09:00'
    );
    expect(aiClasses.length).toBe(1); // Exact 1 copy, not 2
  });

  test('POST /api/timetable/analyze-image extracts structured timetable with conflict detection', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/timetable/analyze-image',
      headers: authHeaders,
      payload: {
        imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAlgAAAGQCAIAAAD9V4nPAAAgEElEQVR4nO3de1DVdf748TcXPaCrsK2KmnbRahpTubTTyv2giIgrYQ14iRShbVhXd9XZaBtqgN0pE5oo2UbXWyqVGClp5oW8jyaiY7YNmYmpkGUYw0VTUOD9++OznS8/OB7Ic46Qr+fjrw9vPudz3ufz7tPT8zknc9FaKwAApHLt6gkAANCVCCEAQDRCCAAQjRACAEQjhAAA0QghAEA0QggAEI0QAgBEI4QAANEIIQBANEIIABDNrhAmJSUVFhYa276+vgsWLDC258+f/8EHH3TyIN7e3h2OWBQVFZnNZrPZ7O7ubmzk5uYuXbr0l85cKfXqq6/aPx+rjh8/HhUVFRERMX78+MrKyluYmw03m3Z7n3zyybBhw4yz9OKLLzp2GgBwx3Cx5y/dXr58eXl5eXZ29uXLl81ms8lk+vTTT5VSgYGBH374oY+PT2cO4u3tXVtba3ukM4/6pW52hFubT2t+fn5bt24dMmTIxo0b33///Q0bNtgzzw6ndzP5+fk//fRTamqqA58dAO48dr0jDAoKOnbsmFKqpKQkJibm6tWrjY2NN27cuHr1qo+PT01NTWJiYmRkZFhYWGlpqVKq/YhFVVXV6NGjy8rKLCP+/v7l5eVKqfr6+gcffNBGsC3v2Ly9vZOTk4cPH75s2bLExMRhw4bl5uZafd6MjIwrV65ERUWVlZWFhISMHDnS2NPw3HPPhYaGhoWFnT171jJoY/JtVFVVNTQ0KKViY2Pnzp1r9YGdn2peXp6/v39AQEBxcbFl2jc75uzZs5csWWL8+P333w8aNMjGPAEASiml7dDS0nLvvfe2tLRkZmbu3LkzOTn58OHDpaWlKSkpWuuUlJSSkhKt9fnz5319fa2OaK29vLwaGxsjIiJ2795tGdFaL168OCcnR2tdUFCQlpbW5qmNfdpsm0ymkpKS8+fPu7i4HDly5Ny5c4MGDbLxvFrr1NTUAwcOVFdXG3tqrT08PAoKCrTW+fn5cXFxlj2tHsSqt99+e+DAgcnJyXv27LnZAzs/1f79+9fX1588efLpp5+2PRkPD48dO3ZYpjF//vw//elPwcHBkydPLi8vtzFhAJDMrlujSqno6Og333xz4cKFBQUF77///uXLl93d3fv27Ttz5syhQ4cOHz7c2O3ChQtfffXVfffd12bEzc3N29s7Pj5+zJgxKSkpxq+Mu3+VlZVPPfXUgQMHZsyYkZaW5ufn1/p5W98htGz36tXr8uXLbm5uHh4eV69edXV1NX7VfibG89bW1l6+fLmgoKC8vPytt966cuWKcZDa2tqePXs2Njbee++9Fy9etHEQpdSLL7548ODBv/3tb1OmTLFMr6am5sMPP3zjjTemTJmyatWq9g/s/FRTUlLq6urmzJkzfvx4y4u1Opnf/OY39fX1rq7/e5e/cOHC4cOH/+Uvf9m0adO///3vPXv22LPQAHDHsjOkWVlZ69ati4iI0Fp/+eWXU6dOTUxM/Oabb7TWAwcOvHbtmta6ubl5//79Vke01h4eHmPGjHnmmWcsx7S8wwsPD//2228DAwPbP6/Vd4Q327D6vMavJkyYsHz58srKyj59+hjjvXv3bmpq0lo3NDTcc889tg/SXlVV1aFDhyzbPj4+Np69k1Pdv3//lClTkpKSOvOKLM6ePWu8kKampn79+t1swgAgnL3/+URQUNDatWtHjhyplHr44YdPnz594cKF+++/XykVHBxcVFSklNq+ffuiRYusjiilTCbToUOHzp07t2LFijYHnzp16sKFCydOnGjnJK0+b0tLS0tLy7FjxxISEhoaGhobG43xpqambdu2KaUKCwsjIiJsH6Q9FxeXhIQE48ui1dXV99xzTycfaPVZ6urqwsPDAwMD8/PzjVkZ0+7MMf/xj39s3bpVKXXkyJFRo0Z16kwBgEB2htS4F7phwwbjx0mTJs2YMcPYrqioiI6ODgsLGzt27JkzZ6yO6J/fx1RVVQ0bNuzIkSNa69///vevvPKK1vrSpUs9evQ4ffp0++f9Re8IrT5vTEzMpEmTXnrppREjRkyfPn3AgAENDQ3GQ2bNmhUaGjp58uSqqirLfKwexKqPP/74D3/4g9lsHjdu3BdffGHjVXdmqtnZ2QEBAX5+fnl5eZZp2z6m4euvvw4ODg4PD58wYQKfEQLAzdj7GaFTVVZWzp49e9euXV09EQDAHav7/s0yW7ZsiY2NzcnJ6eqJAADuZN36HSEAAM7Wfd8RAgBwGxBCAIBohBAAIBohBACIRggBAKIRQgCAaIQQACAaIQQAiEYIAQCiEUIAgGiEEAAgGiEEAIhGCAEAohFCAIBohBAAIBohBACIRggBAKK52/51VlbW7ZkHAAC2ZWRkOOOwHYTQeU8MR8nKymKNujnWqPtjjbo/570x49YoAEA0QggAEI0QAgBEI4QAANEIIQBANEIIABCNEAIARCOEAADRCCEAQDRCCAAQza4QFhUVmc1ms9ns7u5ubOTm5i5dutRRk4NDeHp6JiQkWH5MTEz09PS8heN4e3s7bE5opf119MEHH9hzQFbK4ZKSkgoLC41tX1/fBQsWGNvz58/vcLEcshysqVN1/HeN2jBlypQpU6Yopby9vfft2+eYGcHRTCbTqVOnmpub3dzctNZnzpwxmUxdPSn8H66j7i8oKOjo0aPx8fGXL192d3c/cuSIMX7kyJEXXniha+cG+zn+1qjlTy7e3t7JycnDhw9ftmxZYmLisGHDcnNzlVI1NTWJiYmRkZFhYWGlpaUOnwDaCwgIOHr0qFLqxIkTo0ePNgYvXrwYExMTFhYWExNz8eJFpZS3t3d6enp4eLivr29RUZFS6ocffoiNjQ0NDU1KSjIeVVZWFhISMnLkSGM1/f39y8vLlVL19fUPPvig1rorXt8dqPU7AGO7/YWTl5fn7+8fEBBQXFzMSjlVUFDQsWPHlFIlJSUxMTFXr15tbGy8cePG1atXfXx82i9N++VQ1q4v1rS70DZlZmba3sHg5eXVfttkMpWUlJw/f97FxeXIkSPnzp0bNGiQ1jolJaWkpERrff78eV9f384cHzZ0uEZeXl7r1683dlu0aNHGjRuNNZoxY8a6deu01uvWrXvqqae01p6enq+//rrW+syZM0OHDtVaJyYmvvPOO1rroqIik8mktU5NTT1w4EB1dbWxmosXL87JydFaFxQUpKWlOfF1/prZcx1ZtttfOP3796+vrz958uTTTz/NStnJ9hq1tLTce++9LS0tmZmZO3fuTE5OPnz4cGlpaUpKira2NO2XQ1u7vljTX6ST19EtcGIIPT09m5qatNYmk6m5udnyqyFDhoT/7IEHHjD2wS3rTAirq6tDQkK01uPHj6+rqzMWYvDgwQ0NDVrrhoaGwYMHa61NJlNNTY3xqL59+2qthwwZYuxz48aNXr16aa3r6+uXL1+elpbWu3dvrXVFRUVoaKjWevr06Z999plzXuKvnp0h7NOnj7Z24cyaNSsuLq64uFizUnbrcI0mTJjw1VdfxcTE1NfXr1y5Mjc3Ny8vb+3atdra0rRfDn2T64s17TznhdCuzwht69mzp5ubm1LKw8PD1fX/7sE2NTXt2LHDw8OjpaXl4MGDxj5wqrvuusvV1bWyslIp1bdvX2NQt7uR0rNnT8sdORcXF6XU9evXjR9bWlqM/ePj45988sl58+YZ34oaOnSoq6vrhQsXzp075+fndxteixAtLS3GRm1trbEK7S+cNWvWHDhw4I033njvvfdYKWcLCgoqLS29du1anz59goKCsrKyevTo8c9//lNZW5r2y6GsXV+saTfRBf/5RHBwsHF/fPv27YsWLbr9E5ApOjo6PT09MjLSMhIREWF84e2DDz4wm81KqdZ/XjEEBQVt3rxZKVVUVGRciseOHUtISGhoaGhsbDT2mTp16sKFCydOnHhbXocUXl5eZWVlSql3333X+Jdmmwunrq4uPDw8MDAwPz9/27ZtrJSzBQUFrV27duTIkUqphx9++PTp0xcuXLj//vuVtX+ntV8OZe36Yk27C4e8FbV6S+dmGxUVFdHR0WFhYWPHjj1z5kxnjg8bOnNrVGv9+eefu7i4fPHFF5aRCxcuREdHh4aGRkdHf/fdd9raOn7zzTehoaGhoaHPP/+8MfLSSy+NGDFi+vTpAwYMMO7bXLp0qUePHqdPn3bCi7tD3MJ1tGnTphEjRpjN5rS0tJtdONnZ2QEBAX5+fnl5eayUnTpcI+P7ohs2bDB+nDRp0owZM4zt9kvTfjm0teuLNf1FuvtnhOhCXb5GFRUV48aN69o5dHNdvkYGVsqGbrJGv5SoNXXeGvE3y8AuW7ZsiY2NzcnJ6eqJoAOs1J2HNXUUJ35ZBhLExsbGxsZ29SzQMVbqzsOaOgrvCAEAohFCAIBohBAAIBohBACIRggBAKIRQgCAaIQQACAaIQQAiEYIAQCiEUIAgGiEEAAgGiEEAIhGCAEAohFCAIBohBAAIBohBACIRggBAKK5aK1t/DorK+u2TQUAABsyMjKccVj3rnpiOEpWVhZr1M2xRt0fa9T9Oe+NGbdGAQCiEUIAgGiEEAAgGiEEAIhGCAEAohFCAIBohBAAIBohBACIRggBAKIRQgCAaHaFsK6uLi4uLiQkJC4urq6uTil19uzZCRMmmM3mP/7xjz/88IONPduPwEk8PT0TEhIsPyYmJnp6elrd89VXXzU2vL29HTsH48hlZWVLly517JHvDL169TKbzRERESEhIUePHlW/cAk4sbfBihUrAgICwsPDJ02aVFlZaQzaeaXcbOEsVyJuD7tC+PLLL4eFhR08eDA0NHTRokVKqWeffTYtLW3fvn0LFizIzMy0sWf7ETiJyWQ6depUc3OzUkprfebMGZPJZHVP511+xpEfeeSRP//5z056il+1nj177tu3b+/evUuXLp0zZ84vfTgn1tk++eST9evXHzp0aP/+/XPnzk1KSnLIYW+2cITwNrMrhNu2bZs2bZpSatq0aR9//LFS6sSJE2azWSllNpv37NmjlJowYYLVPduPwHkCAgKM9xknTpwYPXq0MVhWVhYSEjJy5Mjc3FylVEZGxpUrV6Kioozfpqenh4eHjxo1qqioSClVU1OTmJgYGRkZFhZWWlpq7OPt7Z2cnDx8+PBly5YlJiYOGzbMOJSNIxt/gv7xxx+feOIJs9kcFRVVVVWVl5fn7+8fEBBQXFx8e09MtzNq1KizZ88a222WwN/fv7y8XClVX1//4IMPLlmypPVJ48Q61WuvvfbKK68Yt1ImTpw4fPjwGzduGL+y50pRPy9c65Vqc73Mnj3bWOvWq2/7/xqEX0zblJmZaeO3/fr1a25u1lo3Nzf3799faz127NhNmzZprQsLC728vLTW9fX1VvdsP4JbY3uNtNZeXl7r1683dlu0aNHGjRuNpUlNTT1w4EB1dfWgQYMsexobHh4er7/+utb61KlTQ4cO1VqnpKSUlJRorc+fP+/r62vsZjKZSkpKzp8/7+LicuTIkXPnzhmHsnFkY2PmzJnvvfee1nr16tWpqan9+/evr68/efLk008/7ZBz0t10Zo2MjV27do0bN05bW4LFixfn5ORorQsKCtLS0tqcNJkn1oFsr9Hdd9/d0NDQftzOK0X/vHBWV9M4/o4dO3S71XfAC/4V6vA6umUODuE333wTFxdnNptfe+211nkjhM7TmX/JVldXh4SEaK3Hjx9fV1dn+TPK8uXL09LSevfubdnT2DCZTDU1NcZ23759tdZDhgwJ/9kDDzzQ1NSktfb09DQ2TCaTsZodHtnYuPvuuxsbG7XWTU1NtbW1s2bNiouLKy4udsDp6JY6XCNPT8/w8PCwsLDJkyefPXtWW1uCioqK0NBQrfX06dM/++yzNidN5ol1INtrNHDgQKshtPNKsWxYXU2tde/evY3926y+XS/1V8t5IbTr1qiPj8/FixeVUt9//72Pj49Sav369Rs2bNi7d29sbOxDDz1kY8/2I3Ceu+66y9XV1fiEv2/fvsZgfHy8UmrevHmurm3/MejZs6flWwAuLi5Kqaamph07duzbt2/Pnj2rVq1yc3MzdjM2PDw8Wh/ExpENxrWtlHJzc/Py8lqzZs2CBQuWLl06e/ZsB77qXxHjM8L9+/dv2bLlvvvuU9aWYOjQoa6urhcuXDh37pyfn5/Vk8aJdZKHHnroxIkTxrbWetasWca2nVeKxc1Wyt3d3di/zeo75UUKZlcIY2JiCgoKlFIFBQUxMTFKqWPHjm3btk0ptWbNmunTpyulrly5YnXP9iNwqujo6PT09MjISMvIsWPHEhISGhoaGhsbjZGWlpaWlhalVPtrNTg42PgIZPv27R1+ucnGkQ2PPfbY5s2blVIrV65cuHBheHh4YGBgfn6+8Q8PlLUlUEpNnTp14cKFEydOrKurs3rSOLFOMmfOnBdffNH457mgoMDyD7adV4qh/Wq2uV4MltW387XACnveitbW1j7++OPBwcGPP/54bW2t1vr06dPBwcFjxoyZO3eu8YfT8ePHW92z/QhuTSc/f/r8889dXFy++OILy8hLL700YsSI6dOnDxgwwLjtExMTM2nSJN3qzoxlu6KiIjo6OiwsbOzYsWfOnGn9q/YbHR65vLzcciewpqYmOzs7ICDAz88vLy/P7vPRHXX+M0KrI5btS5cu9ejR4/Tp01rrNidN5ol1oA7X6F//+tcjjzxiNpsTEhIuXbpkDNp5pVg22qyU1Sux9erL1E0/I0R3wBp1f45ao4qKCuOrNHC47n8dsfrd9DNCALfNli1bYmNjc3Jyunoi6AKsvlO5d/UEAHRKbGxsbGxsV88CXYPVdyreEQIARCOEAADRCCEAQDRCCAAQjRACAEQjhAAA0QghAEA0QggAEI0QAgBEI4QAANEIIQBANEIIABCNEAIARCOEAADRCCEAQDRCCAAQjRACAERz0Vrb+HVWVtZtmwoAADZkZGQ447DuXfXEcJSsrCzWqJtjjbo/1qj7c94bM26NAgBEI4QAANEIIQBANEIIABCNEAIARCOEAADRCCEAQDRCCAAQjRACAEQjhAAA0ewNYW1tbVJSkpeXl40RpVRdXV1cXFxISEhcXFxdXZ3VEThJr169zGZzREREcHDwmjVrWg+Gh4f7+/t/9NFHSilPT8+EhATLoxITEz09PY3t48ePR0VFRUREjB8/vrKy8ra/gjvf22+//eijjwYGBj766KNr1641Bm922r29vW0frcMdcGtWrlxpMpl++OEH48c25/kWTvurr77qiHnBXvaGcPLkyY8++qiLi4uNEaXUyy+/HBYWdvDgwdDQ0EWLFlkdgZP07Nlz3759e/fuLS4uzs/PLywstAzu379/zZo1c+fOVUqZTKZTp041NzcrpbTWZ86cMZlMxhGSk5NXr169d+/e1NTUv//97134Wu5IO3fuXLVq1e7duw8fPrx79+4VK1bs2rVLcdq7n48++uivf/3rtm3bHHVAQthN2BvCwsLCefPm2RiZMGGCUmrbtm3Tpk1TSk2bNu3jjz+2OgJn6927d3Z29ptvvtl6cPTo0e7u//u71wMCAo4ePaqUOnHixOjRoy37VFVVNTQ0KKViY2ONasKBcnJycnJyjPcT3t7e2dnZixcvVp0+7WVlZSEhISNHjszNzbUMPvfcc6GhoWFhYWfPnnX6C5Dh6tWrP/300zPPPLN169bO7F9TU5OYmBgZGRkWFlZaWqqU+vHHH5944gmz2RwVFVVVVZWRkXHlypWoqCj1/7+btGx7e3vPnj17yZIl7Q8FB9M2ZWZm2t7B4OXldbOR+vp6rXW/fv2am5u11s3Nzf3797c6glvT4Rq1Xp3r16/7+Pi0Hty1a9eWLVuMkfXr1xtHW7Ro0caNGy37vP322wMHDkxOTt6zZ4/D5y+B7TUaPHjwtWvXLD9eu3Zt8ODB+uanvc3llpqaeuDAgerq6kGDBhkjHh4eBQUFWuv8/Py4uDgHvYg7XIfX0aZNm3JycrTWAQEBjY2Nut1CtPkxJSWlpKREa33+/HlfX1+t9cyZM9977z2t9erVq1NTU1s/pPVjLdseHh47duyweiiZOtmjW+D0L8v06dPH2U+BzmtqaurRo4dS6vr162azOTAwcMKECXl5ecZvo6KijJtye/bsiYyMtDwqKSnpyy+/DAkJmT9/fmZmZldMXBCttfHJQidPe3Z29ldffbV48eL6+npjxMXFZcqUKUqp+Pj4w4cP35ZZ3/k2b978zjvvjBkz5rvvvtu/f3+H++/cufP55583m80zZ8786aefmpubd+/e/eSTTyqlZs6caeOmaEtLi7Hh5uY2fvx4q4dy0GvC/9ymb436+PhcvHhRKfX999/7+PhYHcFtUFpaOmrUKPXzZ4SHDx/+7LPPLDdb7rrrLldXV+N7GX379jUGL1269Omnn/72t7+dPXv2rl27li1b1lWTv1ONGDHi+PHjlh+PHz/+yCOPdP60x8fHK6XmzZvn6vq/y9nV1dXNzc3YtnzQC3s0Nzd//fXXJ06cKCkpWbNmTWfujjY1Ne3YsWPfvn179uxZtWqVm5ubcQ9MKeXm5tbm64SW+NXW1l6/ft3Ydnd3N9a0/aEc/PLEc3oIr1y5opSKiYkpKChQShUUFMTExFgdgbPV1NQ8//zzaWlprQd/97vfDR8+3PJjdHR0enp667eDLi4uCQkJRh2rq6vvueee2zZhIZ577rm0tDTju9O1tbXGGnX+tB87diwhIaGhoaGxsdEYaWpqMr7QUVhYGBERcVtexB3u0KFDvr6+xnZoaGhxcXGHDwkODi4qKlJKbd++3fg+4GOPPbZ582al1MqVK1944QWlVEtLi5FALy+vsrIypdS7777b5puGVg8Fx+r4/1BvpyeeeKK4uDg9PX3WrFmbNm3q16+f8e3w9iNwEuMuqIuLy40bN4wbLJZB48+b//nPfyw7T5o0KT09/b///a9lpF+/fsuXL4+Pj/f09HRzc1u9evVtfwV3uKioqG+//TYiIsJkMl2/fn3evHnjxo1TSt3stF+/fj0kJMTYDg4OnjNnTlBQkK+vr7e3d2Njo8lk8vDw2Lhxo/EFnFWrVnXNq7qzbN68eezYscZ2r169BgwYcPLkyTb7tFmX3NzcZ599dtmyZe7u7itWrFBKvf766ykpKW+99ZaXl9e6deuUUqGhobGxsVu3bl2yZElCQsKAAQMee+yx9m/i2x8KDtZVH07CUVij7o816v5Yo+7vV/xlGQAAujNCCAAQjRACAEQjhAAA0QghAEA0QggAEI0QAgBEI4QAANEIIQBANEIIABCNEAIARCOEAADRCCEAQDRCCAAQjRACAEQjhAAA0QghAEA0QggAEI0QAgBEc9Fa2/h1VlbWbZsKAAA2ZGRkOOOw7l31xHCUrKws1qibY426P9ao+3PeGzNujQIARCOEAADRCCEAQDRCCAAQjRACAEQjhAAA0QghAEA0QggAEI0QAgBEI4QAANEIIQBANEIIABCNEAIARCOEAADRCCEAQDRCCAAQjRACAEQjhAAA0QghAEA0F611V88BAIAuwztCAIBohBAAIBohBACIRggBAKIRQgCAaIQQACAaIQQAiEYIAQCiEUIAgGiEEAAgGiEEAIhGCAEAohFCAIBohBAAIBohBACIRggBAKIRQgCAaIQQACAaIQQAiEYIAQCiEUIAgGiEEAAgGiEEAIhGCAEAohFCAIBohBAAIBohBACIRggBAKIRQgCAaIQQACAaIQQAiEYIAQCiEUIAgGiEEAAgGiEEAIhGCAEAohFCAIBohBAAIBohBACIRggBAKIRQgCAaIQQACAaIQQAiEYIAQCiEUIAgGiEEAAgGiEEAIhGCAEAohFCAIBohBAAIBohBACIRggBAKIRQgCAaIQQACAaIQQAiEYIAQCiEUIAgGiEEAAgGiEEAIhGCAEAohFCAIBohBAAIBohBACIRggBAKIRQgCAaIQQACAaIQQAiEYIAQCiEUIAgGiEEAAgGiEEAIhGCAEAohFCAIBohBAAIBohBACIRggBAKIRQgCAaIQQACAaIQQAiEYIAQCiEUIAgGiEEAAgGiEEAIhGCAEAohFCAIBohBAAIBohBACIRggBAKIRQgCAaIQQACAaIQQAiEYIAQCiEUIAgGiEEAAgGiEEAIhGCAEAohFCAIBohBAAIBohBACIRggBAKIRQgCAaIQQACAaIQQAiEYIAQCiEUIAgGiEEAAgGiEEAIhGCAEAohFCAIBohBAAIBohBACIRggBAKIRQgCAaIQQACAaIQQAiEYIAQCiEUIAgGiEEAAgGiEEAIhGCAEAohFCAIBohBAAIBohBACIRggBAKIRQgCAaIQQACAaIQQAiEYIAQCiEUIAgGiEEAAgGiEEAIhGCAEAohFCAIBohBAAIBohBACIRggBAKIRQgCAaIQQACAaIQQAiEYIAQCiEUIAgGiEEAAgGiEEAIhGCAEAohFCAIBohBAAIBohBACIRggBAKIRQgCAaIQQACAaIQQAiEYIAQCiEUIAgGiEEAAgGiEEAIhGCAEAohFCAIBohBAAIBohBACIRggBAKIRQgCAaIQQACAaIQQAiEYIAQCiEUIAgGiEEAAgGiEEAIhGCAEAohFCAIBohBAAIBohBACIRggBAKIRQgCAaIQQACAaIQQAiEYIAQCiEUIAgGiEEAAgGiEEAIhGCAEAohFCAIBohBAAIBohBACIRggBAKIRQgCAaIQQACAaIQQAiEYIAQCiEUIAgGiEEAAgGiEEAIhGCAEAohFCAIBohBAAIBohBACIRggBAKIRQgCAaIQQACAaIQQAiEYIAQCiEUIAgGiEEAAgGiEEAIhGCAEAohFCAIBohBAAIBohBACIRggBAKIRQgCAaIQQACAaIQQAiEYIAQCiEUIAgGiEEAAgGiEEAIhGCAEAohFCAIBohBAAINr/A6XN1rA+1oNcAAAAAElFTkSuQmCC',
        mimeType: 'image/jpeg',
      },
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.body);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.classes)).toBe(true);
    expect(json.classes.length).toBeGreaterThan(0);
    expect(json.classes[0].subjectName).toBeDefined();
    expect(json.classes[0].day).toBeDefined();
    expect(json.classes[0].startTime).toBeDefined();
  });

  test('Security: Rejects requests with invalid or expired authentication token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/onboarding/status',
      headers: {
        authorization: 'Bearer invalid',
      },
    });

    expect(res.statusCode).toBe(401);
  });
});
