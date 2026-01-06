import { Routes } from '@angular/router';
import { Customer } from './customer/customer';
import { Testimg } from './testimg/testimg';

export const routes: Routes = [
  {
    path:'',
  component:Customer,
},
{
  path:'customer',
  component:Testimg

}
];
